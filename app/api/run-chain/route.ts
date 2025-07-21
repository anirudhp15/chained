import { type NextRequest, NextResponse } from "next/server";
import type { Id } from "../../../convex/_generated/dataModel";

// ⚡ PERFORMANCE: Dynamic imports for heavy dependencies to reduce cold start time
// This reduces initial bundle from 11,834+ modules to ~200 modules for instant response

// Create individual authenticated Convex clients to avoid contention
const createAuthenticatedConvexClient = async (token: string) => {
  const { ConvexHttpClient } = await import("convex/browser");
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(token);
  return client;
};

// Improved database queue with better batching
const databaseQueue = new Map<
  string,
  {
    type: string;
    data: any;
    stepId: string;
    retryCount: number;
    timestamp: number;
    convexClient: any; // Store the authenticated client with each item
  }
>();

let isProcessingQueue = false;

function queueDatabaseWrite(
  type: string,
  data: any,
  stepId: string,
  convexClient: any
) {
  const key = `${stepId}-${type}`;
  databaseQueue.set(key, {
    type,
    data,
    stepId,
    retryCount: 0,
    timestamp: Date.now(),
    convexClient, // Store the client with the queue item
  });

  // Debounce queue processing
  if (!isProcessingQueue) {
    setTimeout(() => processDatabaseQueue(), 50); // Reduced delay for better responsiveness
  }
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a concurrency error
      if (error.message?.includes("OptimisticConcurrencyControlFailure")) {
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // For non-concurrency errors, don't retry
        throw error;
      }
    }
  }

  throw lastError;
}

async function processDatabaseQueue() {
  if (isProcessingQueue || databaseQueue.size === 0) return;

  isProcessingQueue = true;

  try {
    // ⚡ PERFORMANCE: Dynamic import API only when processing queue
    const { api } = await import("../../../convex/_generated/api");

    // Process ALL items concurrently instead of sequentially
    const allPromises = Array.from(databaseQueue.entries()).map(
      async ([key, item]) => {
        try {
          await retryWithBackoff(async () => {
            switch (item.type) {
              case "thinking":
                await item.convexClient.mutation(
                  api.mutations.updateAgentStep,
                  {
                    stepId: item.stepId as Id<"agentSteps">,
                    thinking: item.data.thinking,
                    isThinking: item.data.isThinking,
                    isComplete: false,
                    isStreaming: true,
                  }
                );
                break;
              case "content":
                await item.convexClient.mutation(
                  api.mutations.updateStreamedContent,
                  {
                    stepId: item.stepId as Id<"agentSteps">,
                    content: item.data.content,
                  }
                );
                break;
              case "complete":
                await item.convexClient.mutation(
                  api.mutations.completeAgentExecution,
                  {
                    stepId: item.stepId as Id<"agentSteps">,
                    response: item.data.response,
                    thinking: item.data.thinking,
                    tokenUsage: item.data.tokenUsage,
                    estimatedCost: item.data.estimatedCost,
                    firstTokenLatency: item.data.firstTokenLatency,
                  }
                );
                break;
            }
          });

          // Remove successfully processed item
          databaseQueue.delete(key);
        } catch (error) {
          console.error(
            `Database write failed for ${item.type} after retries:`,
            error
          );

          // For critical operations like completion, try to queue again with limited retries
          if (item.type === "complete" && item.retryCount < 2) {
            item.retryCount++;
            // Keep in queue for retry
          } else {
            // Remove failed item after max retries
            databaseQueue.delete(key);
          }
        }
      }
    );

    await Promise.all(allPromises);
  } finally {
    isProcessingQueue = false;

    // Continue processing if there are still items
    if (databaseQueue.size > 0) {
      setTimeout(() => processDatabaseQueue(), 100);
    }
  }
}

// ⚡ PERFORMANCE: Lightweight warmup handler
export async function OPTIONS(request: NextRequest) {
  const isWarmup = request.headers.get("x-warmup");

  if (isWarmup) {
    console.log("🔥 Route warmed: /api/run-chain");
    return new Response("Route warmed", {
      status: 200,
      headers: {
        "x-warmed": "true",
        "x-warmed-at": new Date().toISOString(),
      },
    });
  }

  return new Response("Method not allowed", { status: 405 });
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    console.log("🔍 API Request received");

    // ⚡ PERFORMANCE: Dynamic import heavy dependencies only when needed
    const [
      { ApiValidator, sanitizeInput, validateContentType },
      { rateLimiters, checkUserTierLimits },
      { auth },
      { api },
    ] = await Promise.all([
      import("../../../lib/api-validation"),
      import("../../../lib/rate-limiter"),
      import("@clerk/nextjs/server"),
      import("../../../convex/_generated/api"),
    ]);

    // 1. Validate request size
    const sizeValidation = ApiValidator.validateRequestSize(
      request,
      10 * 1024 * 1024
    ); // 10MB limit
    if (!sizeValidation.success) {
      console.error("❌ Size validation failed:", sizeValidation.error);
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 413 }
      );
    }
    console.log("✅ Size validation passed");

    // 2. Validate content type
    const contentTypeValidation = validateContentType(request, [
      "application/json",
    ]);
    if (!contentTypeValidation.success) {
      console.error(
        "❌ Content type validation failed:",
        contentTypeValidation.error
      );
      return NextResponse.json(
        { error: contentTypeValidation.error },
        { status: 400 }
      );
    }
    console.log("✅ Content type validation passed");

    // 3. Validate authentication
    const authValidation = await ApiValidator.validateAuth();
    if (!authValidation.success) {
      console.error("❌ Auth validation failed:", authValidation.error);
      return NextResponse.json(
        { error: authValidation.error },
        { status: 401 }
      );
    }
    console.log("✅ Auth validation passed");

    const { userId } = authValidation;

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log("✅ JSON parsing successful");
      console.log("📋 Request body keys:", Object.keys(body));
    } catch (error) {
      console.error("❌ JSON parsing failed:", error);
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
      console.error(
        "❌ Required fields validation failed:",
        fieldValidation.error
      );
      console.log("📋 Available fields:", Object.keys(body));
      console.log("📋 stepId:", body.stepId);
      console.log("📋 model:", body.model);
      console.log("📋 prompt:", body.prompt ? "present" : "missing");
      return NextResponse.json(
        { error: fieldValidation.error },
        { status: 400 }
      );
    }
    console.log("✅ Required fields validation passed");

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
      console.error("❌ Model validation failed:", modelValidation.error);
      console.log("📋 Provided model:", model);
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      );
    }
    console.log("✅ Model validation passed:", model);

    const promptValidation = ApiValidator.validatePrompt(prompt);
    if (!promptValidation.success) {
      console.error("❌ Prompt validation failed:", promptValidation.error);
      console.log("📋 Prompt length:", prompt?.length || 0);
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400 }
      );
    }
    console.log("✅ Prompt validation passed");

    const sessionValidation = ApiValidator.validateSessionId(stepId);
    if (!sessionValidation.success) {
      console.error(
        "❌ Session ID validation failed:",
        sessionValidation.error
      );
      console.log("📋 Provided stepId:", stepId);
      return NextResponse.json(
        { error: sessionValidation.error },
        { status: 400 }
      );
    }
    console.log("✅ Session ID validation passed");

    // 7. Check user tier limits (get user tier from database)
    // Note: You'll need to implement getUserTier function to get user's subscription tier
    const userTier: "free" | "pro" = "free"; // Default to free, implement getUserTier(userId) to get actual tier
    const tierLimit = await checkUserTierLimits(userId!, userTier);

    if (!tierLimit.success) {
      console.error("❌ Tier limit exceeded");
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
    console.log("✅ Tier limits passed");

    // 8. Apply additional rate limiting for LLM calls
    const llmRateLimit = await rateLimiters.llm.checkRateLimit(
      `user:${userId}`
    );
    if (!llmRateLimit.success) {
      console.error("❌ Rate limit exceeded");
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
    console.log("✅ Rate limits passed");

    // 9. Sanitize prompt input
    const sanitizedPrompt = sanitizeInput(prompt);
    console.log("✅ Prompt sanitized");

    // Continue with existing authentication and logic...
    const authData = await auth();
    if (!authData.userId) {
      console.error("❌ Auth data missing userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ Auth data validated");

    // Create individual authenticated Convex client for this request
    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      console.error("❌ Failed to get Convex token");
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }
    const convex = await createAuthenticatedConvexClient(token);
    console.log("✅ Individual Convex client authenticated");

    // Get the agent step to check if it belongs to the authenticated user
    const agentStep = await convex.query(api.queries.getAgentStep, {
      stepId: stepId as Id<"agentSteps">,
    });

    if (!agentStep) {
      console.error("❌ Agent step not found:", stepId);
      return NextResponse.json(
        { error: "Agent step not found" },
        { status: 404 }
      );
    }
    console.log("✅ Agent step found and validated");

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
      if (model.includes("gemini")) return "google";
      return "unknown";
    };

    const provider = getProvider(model);
    console.log("🤖 Provider determined:", provider);

    // Create unified thinking manager - DISABLED FOR SPEED
    let thinkingManager = null;
    const SPEED_MODE = true; // Enable maximum streaming speed

    if (!SPEED_MODE) {
      try {
        const { getProviderFromModel, createThinkingManager } = await import(
          "../../../lib/thinking-manager"
        );
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
        const [{ streamGrokEnhanced }, { calculateCost }] = await Promise.all([
          import("../../../lib/grok-enhanced"),
          import("../../../lib/pricing"),
        ]);

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
                    stepId,
                    convex
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
                    stepId,
                    convex
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
                      firstTokenLatency: undefined, // Claude doesn't track first token latency the same way
                    },
                    stepId,
                    convex
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
        const [{ callClaudeWithTools }, { calculateCost }] = await Promise.all([
          import("../../../lib/claude-enhanced"),
          import("../../../lib/pricing"),
        ]);

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

          // ⚡ PERFORMANCE: Dynamic import LLM streaming only when needed
          const { callLLMStream } = await import("../../../lib/llm");

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
                stepId,
                convex
              );

              // Send to client IMMEDIATELY
              const thinkingData = JSON.stringify({
                type: "thinking",
                thinking: chunk.thinking,
                isThinking: chunk.isThinking,
                timestamp: Date.now(),
              });
              controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`));
            } else if (chunk.content && chunk.isComplete !== true) {
              // STREAM-FIRST: Send token to client IMMEDIATELY (handles both !chunk.isComplete and undefined isComplete)

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
                stepId,
                convex
              );
            } else if (chunk.isComplete) {
              tokenUsage = chunk.tokenUsage;
            }
          }

          // Calculate cost if we have token usage
          let estimatedCost: number | undefined = undefined;
          if (tokenUsage) {
            const { calculateCost } = await import("../../../lib/pricing");
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
              firstTokenLatency: firstTokenTime
                ? firstTokenTime - streamStartTime
                : undefined,
            },
            stepId,
            convex
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
