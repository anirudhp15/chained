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
import {
  ApiValidator,
  sanitizeInput,
  validateContentType,
} from "../../../lib/api-validation";
import { rateLimiters, checkUserTierLimits } from "../../../lib/rate-limiter";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// STREAM-FIRST ARCHITECTURE: Non-blocking database queue
const databaseQueue: Array<{
  type: string;
  data: any;
  timestamp: number;
  stepId: string;
}> = [];

function queueDatabaseWrite(type: string, data: any, stepId: string) {
  databaseQueue.push({
    type,
    data,
    timestamp: Date.now(),
    stepId,
  });

  // Process queue async without blocking stream
  setImmediate(() => processDatabaseQueue());
}

async function processDatabaseQueue() {
  if (databaseQueue.length === 0) return;

  const batch = databaseQueue.splice(0, 10); // Process in batches
  try {
    // Batch write to database
    await Promise.all(
      batch.map(async (item) => {
        try {
          switch (item.type) {
            case "thinking":
              await convex.mutation(api.mutations.updateAgentStep, {
                stepId: item.stepId as Id<"agentSteps">,
                thinking: item.data.thinking,
                isThinking: item.data.isThinking,
                isComplete: false,
              });
              break;
            case "content":
              await convex.mutation(api.mutations.updateStreamedContent, {
                stepId: item.stepId as Id<"agentSteps">,
                content: item.data.content,
              });
              break;
            case "complete":
              await convex.mutation(api.mutations.completeAgentExecution, {
                stepId: item.stepId as Id<"agentSteps">,
                response: item.data.response,
                thinking: item.data.thinking,
                tokenUsage: item.data.tokenUsage,
                estimatedCost: item.data.estimatedCost,
              });
              break;
          }
        } catch (error) {
          console.error(`Database write failed for ${item.type}:`, error);
        }
      })
    );
  } catch (error) {
    console.error("Database queue processing error:", error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Validate request size
    const sizeValidation = ApiValidator.validateRequestSize(
      request,
      10 * 1024 * 1024
    ); // 10MB limit
    if (!sizeValidation.success) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 413 }
      );
    }

    // 2. Validate content type
    const contentTypeValidation = validateContentType(request, [
      "application/json",
    ]);
    if (!contentTypeValidation.success) {
      return NextResponse.json(
        { error: contentTypeValidation.error },
        { status: 400 }
      );
    }

    // 3. Validate authentication
    const authValidation = await ApiValidator.validateAuth();
    if (!authValidation.success) {
      return NextResponse.json(
        { error: authValidation.error },
        { status: 401 }
      );
    }

    const { userId } = authValidation;

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // 5. Validate required fields
    const fieldValidation = ApiValidator.validateRequiredFields(body, [
      "stepId",
      "model",
      "prompt",
    ]);
    if (!fieldValidation.success) {
      return NextResponse.json(
        { error: fieldValidation.error },
        { status: 400 }
      );
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
    } = body;

    // 6. Validate individual fields
    const modelValidation = ApiValidator.validateModel(model);
    if (!modelValidation.success) {
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      );
    }

    const promptValidation = ApiValidator.validatePrompt(prompt);
    if (!promptValidation.success) {
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400 }
      );
    }

    const sessionValidation = ApiValidator.validateSessionId(stepId);
    if (!sessionValidation.success) {
      return NextResponse.json(
        { error: sessionValidation.error },
        { status: 400 }
      );
    }

    // 7. Check user tier limits (get user tier from database)
    // Note: You'll need to implement getUserTier function to get user's subscription tier
    const userTier: "free" | "pro" = "free"; // Default to free, implement getUserTier(userId) to get actual tier
    const tierLimit = await checkUserTierLimits(userId!, userTier);

    if (!tierLimit.success) {
      return NextResponse.json(
        {
          error: "Daily limit exceeded",
          message:
            "You have reached your daily limit. Upgrade to Pro for unlimited access.",
          upgradeUrl: "/pricing",
        },
        { status: 429 }
      );
    }

    // 8. Apply additional rate limiting for LLM calls
    const llmRateLimit = await rateLimiters.llm.checkRateLimit(
      `user:${userId}`
    );
    if (!llmRateLimit.success) {
      const retryAfter = Math.ceil((llmRateLimit.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many AI requests. Please wait before trying again.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": llmRateLimit.limit.toString(),
            "X-RateLimit-Remaining": llmRateLimit.remaining.toString(),
            "X-RateLimit-Reset": llmRateLimit.reset.toString(),
          },
        }
      );
    }

    // 9. Sanitize prompt input
    const sanitizedPrompt = sanitizeInput(prompt);

    // Continue with existing authentication and logic...
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const setupTime = performance.now();
    console.log(`🚀 STREAM-FIRST: Setup time: ${setupTime - startTime}ms`);

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

    // Create unified thinking manager - DISABLED FOR SPEED
    let thinkingManager = null;
    const SPEED_MODE = true; // Enable maximum streaming speed

    if (!SPEED_MODE) {
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
                [{ role: "user", content: sanitizedPrompt }],
                {
                  realTimeData: grokOptions.realTimeData,
                  thinkingMode: grokOptions.thinkingMode,
                }
              )) {
                if (chunk.type === "thinking" && chunk.thinking !== undefined) {
                  // Stream thinking content in real-time
                  fullThinking = chunk.thinking;

                  // STREAM-FIRST: Queue database write (non-blocking)
                  queueDatabaseWrite(
                    "thinking",
                    {
                      thinking: fullThinking,
                      isThinking: true,
                    },
                    stepId
                  );

                  // Send thinking update to client IMMEDIATELY
                  const thinkingData = JSON.stringify({
                    type: "thinking",
                    thinking: fullThinking,
                    timestamp: Date.now(),
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

                  // Send content token to client IMMEDIATELY
                  const tokenData = JSON.stringify({
                    type: "token",
                    content: chunk.content,
                    timestamp: Date.now(),
                  });
                  controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));

                  // STREAM-FIRST: Queue database write (non-blocking)
                  queueDatabaseWrite(
                    "content",
                    {
                      content: fullContent,
                    },
                    stepId
                  );
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

                  // STREAM-FIRST: Queue final database write (non-blocking)
                  queueDatabaseWrite(
                    "complete",
                    {
                      response: fullContent,
                      thinking: fullThinking,
                      tokenUsage: tokenUsage,
                      estimatedCost,
                    },
                    stepId
                  );

                  // Send completion event IMMEDIATELY
                  const completeData = JSON.stringify({
                    type: "complete",
                    content: fullContent,
                    thinking: fullThinking,
                    tokenUsage: tokenUsage,
                    estimatedCost,
                    timestamp: Date.now(),
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
          [{ role: "user", content: sanitizedPrompt }],
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
                sendChunk(); // Immediate recursive call - no artificial delay
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
        const streamStartTime = performance.now();
        console.log(
          `🚀 STREAM-FIRST: Stream start time: ${streamStartTime - startTime}ms`
        );

        let firstTokenTime: number | null = null;
        let tokenCount = 0;

        try {
          let fullContent = "";
          let fullThinking = "";
          let tokenUsage: any = undefined;

          // Stream tokens from LLM with unified thinking manager
          for await (const chunk of callLLMStream({
            model,
            prompt: sanitizedPrompt,
            images,
            audioTranscription,
            webSearchResults,
            options: {
              stepId: stepId as Id<"agentSteps">,
              convexClient: convex,
              enableThinking: false, // Disabled for speed
            },
          })) {
            if (chunk.thinking !== undefined) {
              // STREAM-FIRST: Handle thinking updates
              fullThinking = chunk.thinking;

              // Queue database write (non-blocking)
              queueDatabaseWrite(
                "thinking",
                {
                  thinking: chunk.thinking,
                  isThinking: chunk.isThinking,
                },
                stepId
              );

              // Send to client IMMEDIATELY
              const thinkingData = JSON.stringify({
                type: "thinking",
                thinking: chunk.thinking,
                isThinking: chunk.isThinking,
                timestamp: Date.now(),
              });
              controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`));
            } else if (chunk.content && !chunk.isComplete) {
              // STREAM-FIRST: Send token to client IMMEDIATELY
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
                console.log(
                  `🚀 STREAM-FIRST: First token latency: ${firstTokenTime - streamStartTime}ms`
                );
              }

              tokenCount++;
              fullContent += chunk.content;

              const tokenData = JSON.stringify({
                type: "token",
                content: chunk.content,
                timestamp: Date.now(),
              });
              controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));

              // Queue database write (non-blocking)
              queueDatabaseWrite(
                "content",
                {
                  content: fullContent,
                },
                stepId
              );
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
          // REMOVED FOR STREAM-FIRST ARCHITECTURE - Database writes are queued instead
          // await convex.mutation(api.mutations.completeAgentExecution, {
          //   stepId: stepId as Id<"agentSteps">,
          //   response: fullContent,
          //   thinking: fullThinking,
          //   tokenUsage: tokenUsage,
          //   estimatedCost,
          // });

          // STREAM-FIRST: Queue final database write (non-blocking)
          queueDatabaseWrite(
            "complete",
            {
              response: fullContent,
              thinking: fullThinking,
              tokenUsage: tokenUsage,
              estimatedCost,
            },
            stepId
          );

          const endTime = performance.now();
          const totalTime = endTime - streamStartTime;
          const tokensPerSecond =
            tokenCount > 0 ? (tokenCount / (totalTime / 1000)).toFixed(2) : "0";

          console.log(`🚀 STREAM-FIRST: Total stream time: ${totalTime}ms`);
          console.log(`🚀 STREAM-FIRST: Tokens delivered: ${tokenCount}`);
          console.log(`🚀 STREAM-FIRST: Tokens per second: ${tokensPerSecond}`);

          // Send completion event IMMEDIATELY
          const completeData = JSON.stringify({
            type: "complete",
            content: fullContent,
            thinking: fullThinking,
            tokenUsage: tokenUsage,
            estimatedCost,
            timestamp: Date.now(),
            performance: {
              totalTime,
              tokenCount,
              tokensPerSecond: parseFloat(tokensPerSecond),
              firstTokenLatency: firstTokenTime
                ? firstTokenTime - streamStartTime
                : null,
            },
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
