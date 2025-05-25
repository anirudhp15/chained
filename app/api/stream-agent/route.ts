import { type NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function POST(request: NextRequest) {
  try {
    const { stepId, model, prompt } = await request.json();

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Mark as streaming
          await convex.mutation(api.mutations.updateAgentStreaming, {
            stepId: stepId as Id<"agentSteps">,
            isStreaming: true,
          });

          const fullResponse = "";
          const tokenUsage: TokenUsage | null = null;

          // Stream the response based on model provider
          if (model.startsWith("gpt-") || model.includes("openai")) {
            await streamOpenAI(
              model,
              prompt,
              controller,
              stepId as Id<"agentSteps">,
              fullResponse,
              tokenUsage
            );
          } else if (model.includes("claude")) {
            await streamAnthropic(
              model,
              prompt,
              controller,
              stepId as Id<"agentSteps">,
              fullResponse,
              tokenUsage
            );
          } else {
            throw new Error(`Unsupported model: ${model}`);
          }
        } catch (error) {
          console.error("Streaming failed:", error);

          await convex.mutation(api.mutations.updateAgentError, {
            stepId: stepId as Id<"agentSteps">,
            error:
              error instanceof Error
                ? error.message
                : "Unknown streaming error",
            isComplete: true,
            isStreaming: false,
          });

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown streaming error",
              })}\n\n`
            )
          );
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
    console.error("Stream setup failed:", error);
    return new Response(JSON.stringify({ error: "Failed to setup stream" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function streamOpenAI(
  model: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  stepId: Id<"agentSteps">,
  fullResponse: string,
  tokenUsage: TokenUsage | null
) {
  try {
    const stream = await openai.chat.completions.create({
      model: model.replace("openai-", ""),
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 4000,
    });

    let chunkCount = 0;
    const updateFrequency = 5; // Update database every 5 chunks for better performance

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        const content = delta.content;
        fullResponse += content;
        chunkCount++;

        // Send chunk to client immediately for fast streaming
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "chunk",
              content: content,
              fullContent: fullResponse,
            })}\n\n`
          )
        );

        // Update database less frequently to improve performance
        if (chunkCount % updateFrequency === 0) {
          await convex.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: fullResponse,
          });
        }
      }

      // Handle usage information
      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    // Final update to database
    await convex.mutation(api.mutations.updateAgentResponse, {
      stepId,
      response: fullResponse,
      tokenUsage: tokenUsage || undefined,
      isComplete: true,
      isStreaming: false,
    });

    // Send completion signal
    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify({
          type: "complete",
          response: fullResponse,
          tokenUsage: tokenUsage || undefined,
        })}\n\n`
      )
    );

    controller.close();
  } catch (error) {
    throw new Error(
      `OpenAI streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function streamAnthropic(
  model: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  stepId: Id<"agentSteps">,
  fullResponse: string,
  tokenUsage: TokenUsage | null
) {
  try {
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let chunkCount = 0;
    const updateFrequency = 5; // Update database every 5 chunks for better performance

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const content = chunk.delta.text;
        fullResponse += content;
        chunkCount++;

        // Send chunk to client immediately for fast streaming
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "chunk",
              content: content,
              fullContent: fullResponse,
            })}\n\n`
          )
        );

        // Update database less frequently to improve performance
        if (chunkCount % updateFrequency === 0) {
          await convex.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: fullResponse,
          });
        }
      }

      if (chunk.type === "message_delta" && chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.input_tokens || 0,
          completionTokens: chunk.usage.output_tokens || 0,
          totalTokens:
            (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0),
        };
      }
    }

    // Final update to database
    await convex.mutation(api.mutations.updateAgentResponse, {
      stepId,
      response: fullResponse,
      tokenUsage: tokenUsage || undefined,
      isComplete: true,
      isStreaming: false,
    });

    // Send completion signal
    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify({
          type: "complete",
          response: fullResponse,
          tokenUsage: tokenUsage || undefined,
        })}\n\n`
      )
    );

    controller.close();
  } catch (error) {
    throw new Error(
      `Anthropic streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
