import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { callLLMStream } from "../../../lib/llm";
import { calculateCost } from "../../../lib/pricing";
import type { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authData = await auth();
    const { userId } = authData;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stepId, model, prompt } = await request.json();

    if (!stepId || !model || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: stepId, model, prompt" },
        { status: 400 }
      );
    }

    // Set up authenticated Convex client
    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }
    convex.setAuth(token);

    // Get the agent step to check if it belongs to the authenticated user
    const agentStep = await convex.query(api.queries.getAgentStep, {
      stepId: stepId as Id<"agentSteps">,
    });

    if (!agentStep) {
      return NextResponse.json(
        { error: "Agent step not found" },
        { status: 404 }
      );
    }

    // Mark execution start and streaming state
    await convex.mutation(api.mutations.updateAgentStep, {
      stepId: stepId as Id<"agentSteps">,
      isStreaming: true,
      isComplete: false,
    });

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let tokenUsage: any = undefined;

          // Stream tokens from LLM
          for await (const chunk of callLLMStream({
            model,
            prompt,
          })) {
            if (chunk.content && !chunk.isComplete) {
              // Send token to client
              fullContent += chunk.content;
              const tokenData = JSON.stringify({
                type: "token",
                content: chunk.content,
              });
              controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));

              // Update streamed content in database periodically
              await convex.mutation(api.mutations.updateStreamedContent, {
                stepId: stepId as Id<"agentSteps">,
                content: fullContent,
              });
            } else if (chunk.isComplete) {
              tokenUsage = chunk.tokenUsage;
            }
          }

          // Calculate cost if we have token usage
          let estimatedCost: number | undefined = undefined;
          if (tokenUsage) {
            estimatedCost = calculateCost(
              model,
              tokenUsage.promptTokens,
              tokenUsage.completionTokens
            );
          }

          // Complete execution with performance metrics
          await convex.mutation(api.mutations.completeAgentExecution, {
            stepId: stepId as Id<"agentSteps">,
            response: fullContent,
            tokenUsage: tokenUsage,
            estimatedCost,
          });

          // Send completion event
          const completeData = JSON.stringify({
            type: "complete",
            content: fullContent,
            tokenUsage: tokenUsage,
            estimatedCost,
          });
          controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);

          // Mark step as errored
          await convex.mutation(api.mutations.updateAgentStep, {
            stepId: stepId as Id<"agentSteps">,
            error: error instanceof Error ? error.message : "Unknown error",
            isStreaming: false,
            isComplete: false,
          });

          // Send error event
          const errorData = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
