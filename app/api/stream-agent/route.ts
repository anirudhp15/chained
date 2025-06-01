import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { callGrokEnhanced, streamGrokEnhanced } from "@/lib/grok-enhanced";
import { streamClaudeWithTools, type ClaudeModel } from "@/lib/claude-enhanced";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface StreamAgentRequest {
  messages: Array<{ role: string; content: string }>;
  agentId: string;
  model: string;
  provider: string;
  stepId?: string; // Add stepId to store thinking content
  webSearchEnabled?: boolean; // New field for web search toggle
  grokOptions?: {
    realTimeData: boolean;
    thinkingMode: boolean;
  };
  claudeOptions?: {
    enableTools: boolean;
    toolSet: string;
    fileAttachments?: Array<{
      name: string;
      content: string;
      mimeType: string;
    }>;
  };
}

interface StreamChunk {
  type: string;
  content?: string;
  toolCall?: {
    name: string;
    input: unknown;
  };
  usage?: unknown;
}

// Utility function to convert Grok AsyncGenerator to streaming response
async function createGrokStreamingResponse(
  stream: AsyncGenerator<StreamChunk, void, unknown>
) {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Convert chunk to AI SDK format
          let data: string = "";

          if (chunk.type === "thinking") {
            data = JSON.stringify({
              type: "text-delta",
              textDelta: "", // Don't stream thinking content in this format
            });
          } else if (chunk.type === "content") {
            data = JSON.stringify({
              type: "text-delta",
              textDelta: chunk.content || "",
            });
          } else if (chunk.type === "complete") {
            data = JSON.stringify({
              type: "finish",
              finishReason: "stop",
              usage: chunk.usage,
            });
            controller.enqueue(encoder.encode(`0:${data}\n`));
            controller.close();
            return;
          }

          if (data) {
            controller.enqueue(encoder.encode(`0:${data}\n`));
          }
        }
      } catch (error) {
        console.error("Grok streaming error:", error);
        const errorData = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`0:${errorData}\n`));
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}

// Utility function to convert Claude AsyncGenerator to streaming response
async function createClaudeStreamingResponse(
  stream: AsyncGenerator<StreamChunk, void, unknown>
) {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Convert chunk to AI SDK format
          let data: string = "";

          if (chunk.type === "thinking") {
            data = JSON.stringify({
              type: "text-delta",
              textDelta: "", // Don't stream thinking content in this format
            });
          } else if (chunk.type === "content") {
            data = JSON.stringify({
              type: "text-delta",
              textDelta: chunk.content || "",
            });
          } else if (chunk.type === "tool_call") {
            data = JSON.stringify({
              type: "tool-call-delta",
              toolCallId: chunk.toolCall?.name || "",
              toolName: chunk.toolCall?.name || "",
              argsTextDelta: JSON.stringify(chunk.toolCall?.input || {}),
            });
          } else if (chunk.type === "complete") {
            data = JSON.stringify({
              type: "finish",
              finishReason: "stop",
              usage: chunk.usage,
            });
            controller.enqueue(encoder.encode(`0:${data}\n`));
            controller.close();
            return;
          }

          if (data) {
            controller.enqueue(encoder.encode(`0:${data}\n`));
          }
        }
      } catch (error) {
        console.error("Claude streaming error:", error);
        const errorData = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`0:${errorData}\n`));
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      model,
      provider,
      stepId,
      webSearchEnabled, // TODO: Integrate with web search API when enabled
      grokOptions,
      claudeOptions,
    }: StreamAgentRequest = await req.json();

    // Set up authenticated Convex client if stepId is provided
    let authenticatedConvex: ConvexHttpClient | null = null;
    if (stepId) {
      const authData = await auth();
      const { userId } = authData;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const token = await authData.getToken({ template: "convex" });
      if (!token) {
        return NextResponse.json(
          { error: "Failed to get auth token" },
          { status: 401 }
        );
      }

      authenticatedConvex = new ConvexHttpClient(
        process.env.NEXT_PUBLIC_CONVEX_URL!
      );
      authenticatedConvex.setAuth(token);
    }

    // Handle Grok enhanced features
    if (provider === "xai" && grokOptions) {
      if (grokOptions.thinkingMode) {
        // For thinking mode, use non-streaming to get the thinking process
        const response = await callGrokEnhanced(messages, {
          realTimeData: grokOptions.realTimeData,
          thinkingMode: true,
        });

        // Store thinking content in database if stepId is provided
        if (stepId && authenticatedConvex && response.thinking) {
          await authenticatedConvex.mutation(api.mutations.updateAgentStep, {
            stepId: stepId as Id<"agentSteps">,
            reasoning: response.thinking,
            response: response.content,
            isComplete: true,
            isStreaming: false,
            tokenUsage: response.usage,
          });
        }

        // Return streaming response with the content
        return new Response(response.content, {
          headers: {
            "Content-Type": "text/plain",
          },
        });
      } else if (grokOptions.realTimeData) {
        // For real-time data without thinking, use enhanced streaming
        const stream = streamGrokEnhanced(messages, {
          realTimeData: true,
          thinkingMode: false,
        });
        return createGrokStreamingResponse(stream);
      }
    }

    // Handle Claude enhanced features
    if (provider === "anthropic" && claudeOptions?.enableTools) {
      const stream = streamClaudeWithTools(messages, {
        model: model as ClaudeModel,
        fileAttachments: claudeOptions.fileAttachments,
      });
      return createClaudeStreamingResponse(stream);
    }

    // Default streaming for all providers
    let modelInstance;
    switch (provider) {
      case "openai":
        modelInstance = openai(model);
        break;
      case "anthropic":
        modelInstance = anthropic(model);
        break;
      case "xai":
        modelInstance = xai(model);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return streamText({
      model: modelInstance,
      messages: messages as Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }>,
    }).toDataStreamResponse();
  } catch (error) {
    console.error("Stream agent error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
