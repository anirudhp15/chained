import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { callLLMStream } from "../../../lib/llm";
import { calculateCost } from "../../../lib/pricing";
import { streamGrokEnhanced } from "../../../lib/grok-enhanced";
import { callClaudeWithTools } from "../../../lib/claude-enhanced";
import {
  createThinkingManager,
  getProviderFromModel,
} from "../../../lib/thinking-manager";
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

    const {
      stepId,
      model,
      prompt,
      grokOptions,
      claudeOptions,
      images,
      audioTranscription,
      webSearchResults,
    } = await request.json();

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

    // Determine provider from model
    const getProvider = (model: string) => {
      if (
        model.startsWith("gpt-") ||
        model.includes("openai") ||
        model.startsWith("o1") ||
        model.startsWith("o3") ||
        model.startsWith("o4")
      )
        return "openai";
      if (model.includes("claude")) return "anthropic";
      if (model.startsWith("grok-") || model.includes("xai")) return "xai";
      return "unknown";
    };

    const provider = getProvider(model);

    // Create unified thinking manager
    let thinkingManager = null;
    try {
      const providerType = getProviderFromModel(model);
      thinkingManager = createThinkingManager({
        stepId: stepId as Id<"agentSteps">,
        convexClient: convex,
        provider: providerType,
        model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager:", error);
    }

    // Handle Grok enhanced features with real-time streaming
    if (
      provider === "xai" &&
      grokOptions &&
      (grokOptions.realTimeData || grokOptions.thinkingMode)
    ) {
      try {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let fullContent = "";
            let fullThinking = "";
            let tokenUsage: any = undefined;
            let estimatedCost: number | undefined = undefined;

            try {
              // Stream from Grok enhanced
              for await (const chunk of streamGrokEnhanced(
                [{ role: "user", content: prompt }],
                {
                  realTimeData: grokOptions.realTimeData,
                  thinkingMode: grokOptions.thinkingMode,
                }
              )) {
                if (chunk.type === "thinking" && chunk.thinking !== undefined) {
                  // Stream thinking content in real-time
                  fullThinking = chunk.thinking;

                  // Update thinking via ThinkingManager if available
                  if (thinkingManager) {
                    await thinkingManager.queueUpdate("thinking", {
                      thinking: fullThinking,
                      isThinking: true,
                    });
                  } else {
                    // Fallback to direct database update
                    await convex.mutation(api.mutations.updateAgentStep, {
                      stepId: stepId as Id<"agentSteps">,
                      thinking: fullThinking,
                      isThinking: true,
                      isComplete: false,
                    });
                  }

                  // Send thinking update to client
                  const thinkingData = JSON.stringify({
                    type: "thinking",
                    thinking: fullThinking,
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${thinkingData}\n\n`)
                  );
                } else if (
                  chunk.type === "content" &&
                  chunk.content !== undefined
                ) {
                  // Stream response content in real-time
                  fullContent = chunk.content;

                  // Send content token to client
                  const tokenData = JSON.stringify({
                    type: "token",
                    content: chunk.content,
                  });
                  controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));

                  // Update streamed content via ThinkingManager if available
                  if (thinkingManager) {
                    await thinkingManager.updateStreamContent(fullContent);
                  } else {
                    // Fallback to direct database update
                    await convex.mutation(api.mutations.updateStreamedContent, {
                      stepId: stepId as Id<"agentSteps">,
                      content: fullContent,
                    });
                  }
                } else if (chunk.type === "complete") {
                  // Final completion
                  tokenUsage = chunk.usage;
                  fullContent = chunk.content || fullContent;
                  fullThinking = chunk.thinking || fullThinking;

                  // Calculate cost if we have token usage
                  if (tokenUsage) {
                    estimatedCost = calculateCost(
                      model,
                      tokenUsage.promptTokens,
                      tokenUsage.completionTokens
                    );
                  }

                  // Complete execution with final data
                  await convex.mutation(api.mutations.completeAgentExecution, {
                    stepId: stepId as Id<"agentSteps">,
                    response: fullContent,
                    tokenUsage: tokenUsage,
                    estimatedCost,
                  });

                  // Complete thinking via ThinkingManager if available
                  if (thinkingManager) {
                    await thinkingManager.completeThinking(fullThinking);
                  } else {
                    // Fallback to direct database update
                    await convex.mutation(api.mutations.updateAgentStep, {
                      stepId: stepId as Id<"agentSteps">,
                      thinking: fullThinking,
                      isComplete: true,
                    });
                  }

                  // Send completion event
                  const completeData = JSON.stringify({
                    type: "complete",
                    content: fullContent,
                    thinking: fullThinking,
                    tokenUsage: tokenUsage,
                    estimatedCost,
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${completeData}\n\n`)
                  );
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  controller.close();
                  return;
                }
              }
            } catch (error) {
              console.error("Grok enhanced streaming error:", error);

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
            } finally {
              // Clean up thinking manager
              if (thinkingManager) {
                await thinkingManager.cleanup();
              }
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
        console.error("Grok enhanced call failed:", error);
        if (thinkingManager) {
          await thinkingManager.cleanup();
        }
        await convex.mutation(api.mutations.updateAgentStep, {
          stepId: stepId as Id<"agentSteps">,
          error: error instanceof Error ? error.message : "Unknown error",
          isStreaming: false,
          isComplete: false,
        });
        return NextResponse.json(
          { error: "Grok enhanced call failed" },
          { status: 500 }
        );
      }
    }

    // Handle Claude enhanced features
    if (provider === "anthropic" && claudeOptions?.enableTools) {
      try {
        const response = await callClaudeWithTools(
          [{ role: "user", content: prompt }],
          {
            model: model as any,
            fileAttachments: claudeOptions.fileAttachments,
          }
        );

        // Calculate cost if we have token usage
        let estimatedCost: number | undefined = undefined;
        if (response.usage) {
          estimatedCost = calculateCost(
            model,
            response.usage.promptTokens,
            response.usage.completionTokens
          );
        }

        // Complete execution with enhanced response
        await convex.mutation(api.mutations.updateAgentStep, {
          stepId: stepId as Id<"agentSteps">,
          response: response.content,
          tokenUsage: response.usage,
          estimatedCost,
          isComplete: true,
          isStreaming: false,
        });

        // Return streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send the content as a stream
            const chunks = response.content.split(" ");
            let index = 0;

            const sendChunk = () => {
              if (index < chunks.length) {
                const chunk =
                  chunks[index] + (index < chunks.length - 1 ? " " : "");
                const tokenData = JSON.stringify({
                  type: "token",
                  content: chunk,
                });
                controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));
                index++;
                setTimeout(sendChunk, 50); // Simulate streaming
              } else {
                // Send completion event
                const completeData = JSON.stringify({
                  type: "complete",
                  content: response.content,
                  tokenUsage: response.usage,
                  estimatedCost,
                  toolCalls: response.toolCalls,
                });
                controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
              }
            };

            sendChunk();
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
        console.error("Claude enhanced call failed:", error);
        if (thinkingManager) {
          await thinkingManager.cleanup();
        }
        await convex.mutation(api.mutations.updateAgentStep, {
          stepId: stepId as Id<"agentSteps">,
          error: error instanceof Error ? error.message : "Unknown error",
          isStreaming: false,
          isComplete: false,
        });
        return NextResponse.json(
          { error: "Claude enhanced call failed" },
          { status: 500 }
        );
      }
    }

    // Default unified streaming for all other cases
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let fullThinking = "";
          let tokenUsage: any = undefined;

          // Stream tokens from LLM with unified thinking manager
          for await (const chunk of callLLMStream({
            model,
            prompt,
            images,
            audioTranscription,
            webSearchResults,
            options: {
              stepId: stepId as Id<"agentSteps">,
              convexClient: convex,
              enableThinking: true,
            },
          })) {
            if (chunk.thinking !== undefined) {
              // Handle thinking updates through manager
              fullThinking = chunk.thinking;
              const thinkingData = JSON.stringify({
                type: "thinking",
                thinking: chunk.thinking,
                isThinking: chunk.isThinking,
              });
              controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`));
            } else if (chunk.content && !chunk.isComplete) {
              // Send token to client
              fullContent += chunk.content;
              const tokenData = JSON.stringify({
                type: "token",
                content: chunk.content,
              });
              controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));
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
            thinking: fullThinking,
            tokenUsage: tokenUsage,
            estimatedCost,
          });

          // Send completion event
          const completeData = JSON.stringify({
            type: "complete",
            content: fullContent,
            thinking: fullThinking,
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
        } finally {
          // Clean up thinking manager
          if (thinkingManager) {
            await thinkingManager.cleanup();
          }
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
    console.error("Run chain error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
