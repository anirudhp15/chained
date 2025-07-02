import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { callLLMStream } from "../../../lib/llm";
import { calculateCost } from "../../../lib/pricing";
import { streamGrokEnhanced } from "../../../lib/grok-enhanced";
import { callClaudeWithTools } from "../../../lib/claude-enhanced";
import { getProviderFromModel } from "../../../lib/thinking-manager";
import type { Id } from "../../../convex/_generated/dataModel";

// PARALLEL STREAMING ENDPOINT - Designed for concurrent execution
// This endpoint bypasses all rate limiting and queuing for true parallel performance

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    console.log(
      "🚀 PARALLEL-STREAM: Endpoint reached - starting parallel agent stream"
    );
    console.log("🚀 PARALLEL-STREAM: Request URL:", request.url);
    console.log("🚀 PARALLEL-STREAM: Request method:", request.method);

    // Parse request body
    const body = await request.json();
    const {
      stepId,
      model,
      prompt,
      grokOptions,
      claudeOptions,
      images,
      audioTranscription,
      webSearchResults,
      isParallel,
    } = body;

    if (!isParallel) {
      return NextResponse.json(
        { error: "This endpoint is only for parallel execution" },
        { status: 400 }
      );
    }

    // Quick auth check
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create individual authenticated Convex client
    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    // Get agent step for validation
    const agentStep = await convex.query(api.queries.getAgentStep, {
      stepId: stepId as Id<"agentSteps">,
    });

    if (!agentStep || agentStep.userId !== authData.userId) {
      return NextResponse.json(
        { error: "Agent step not found" },
        { status: 404 }
      );
    }

    console.log(`🚀 PARALLEL-STREAM: Starting ${model} for step ${stepId}`);

    // Determine the provider and start streaming
    const provider = getProviderFromModel(model);

    // Sanitize prompt
    const sanitizedPrompt = prompt.trim();

    let streamFunction;
    if (provider === "anthropic" && claudeOptions?.enableTools) {
      streamFunction = () =>
        callClaudeWithTools([{ role: "user", content: sanitizedPrompt }], {
          model: model as any,
          fileAttachments: claudeOptions.fileAttachments,
        });
    } else if (provider === "xai") {
      streamFunction = () =>
        streamGrokEnhanced([{ role: "user", content: sanitizedPrompt }], {
          realTimeData: grokOptions?.realTimeData,
          thinkingMode: grokOptions?.thinkingMode,
        });
    } else {
      streamFunction = () =>
        callLLMStream({
          model,
          prompt: sanitizedPrompt,
          images,
          audioTranscription,
          webSearchResults,
          options: {
            stepId: stepId as Id<"agentSteps">,
            convexClient: convex,
            enableThinking: false,
          },
        });
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let fullThinking = "";
          let tokenUsage: any = null;

          // Handle different provider responses
          if (provider === "anthropic" && claudeOptions?.enableTools) {
            // Claude returns a Promise, not a stream
            const response = (await streamFunction()) as any;
            fullContent = response.content || "";
            tokenUsage = response.usage;

            // Send complete response at once
            const tokenData = JSON.stringify({
              type: "token",
              content: fullContent,
              timestamp: Date.now(),
            });
            controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));
          } else {
            // Other providers return async generators
            const generator = streamFunction() as any;
            for await (const chunk of generator) {
              if (chunk.type === "thinking") {
                fullThinking = chunk.thinking;

                // Send thinking update
                const thinkingData = JSON.stringify({
                  type: "thinking",
                  thinking: chunk.thinking,
                  isThinking: chunk.isThinking,
                  timestamp: Date.now(),
                });
                controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`));

                // Update database without blocking
                convex
                  .mutation(api.mutations.updateAgentStep, {
                    stepId: stepId as Id<"agentSteps">,
                    thinking: chunk.thinking,
                    isThinking: chunk.isThinking,
                    isComplete: false,
                    isStreaming: true,
                  })
                  .catch(console.error);
              } else if (chunk.content && chunk.content !== fullContent) {
                fullContent = chunk.content;

                // Send content update
                const tokenData = JSON.stringify({
                  type: "token",
                  content: chunk.content,
                  timestamp: Date.now(),
                });
                controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));

                // Update database without blocking
                convex
                  .mutation(api.mutations.updateStreamedContent, {
                    stepId: stepId as Id<"agentSteps">,
                    content: fullContent,
                  })
                  .catch(console.error);
              } else if (chunk.isComplete) {
                tokenUsage = chunk.tokenUsage;
                break;
              }
            }
          }

          const estimatedCost = tokenUsage
            ? calculateCost(
                model,
                tokenUsage.promptTokens || 0,
                tokenUsage.completionTokens || 0
              )
            : 0;

          // Send completion
          const completeData = JSON.stringify({
            type: "complete",
            content: fullContent,
            thinking: fullThinking,
            tokenUsage,
            estimatedCost,
          });
          controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));

          // Final database update
          convex
            .mutation(api.mutations.completeAgentExecution, {
              stepId: stepId as Id<"agentSteps">,
              response: fullContent,
              thinking: fullThinking,
              tokenUsage: tokenUsage,
              estimatedCost,
              firstTokenLatency: undefined, // Parallel endpoint doesn't track first token latency yet
            })
            .catch(console.error);

          const endTime = performance.now();
          console.log(
            `✅ PARALLEL-STREAM: Completed ${model} in ${endTime - startTime}ms`
          );

          controller.close();
        } catch (error) {
          console.error("❌ PARALLEL-STREAM: Error:", error);
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
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ PARALLEL-STREAM: Request failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add a simple GET endpoint for testing
export async function GET(request: NextRequest) {
  console.log("🚀 PARALLEL-STREAM: GET endpoint reached");
  return NextResponse.json({
    message: "Parallel streaming endpoint is working",
    timestamp: Date.now(),
  });
}
