import { xai } from "@ai-sdk/xai";
import { generateText, streamText } from "ai";
import {
  createThinkingManager,
  type ThinkingManager,
} from "./thinking-manager";
import type { Id } from "../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

export interface GrokEnhancedOptions {
  realTimeData?: boolean;
  thinkingMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  model?: GrokModel;
  stepId?: Id<"agentSteps">;
  convexClient?: ConvexHttpClient;
}

export interface GrokEnhancedResponse {
  content: string;
  thinking?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GrokStreamChunk {
  type: "thinking" | "content" | "complete";
  content?: string;
  thinking?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type GrokModel =
  | "grok-3"
  | "grok-2-1212"
  | "grok-2-vision-1212"
  | "grok-2-public"
  | "grok-beta";

// Enhanced system prompt for real-time data
function buildEnhancedSystemPrompt(options: GrokEnhancedOptions): string {
  let systemPrompt = "";

  if (options.realTimeData) {
    const currentDate = new Date().toISOString();
    systemPrompt += `Current date and time: ${currentDate}\n`;
    systemPrompt +=
      "You have access to real-time information. Use your knowledge cutoff as a baseline, but acknowledge when information might be more current than your training data.\n\n";
  }

  if (options.thinkingMode) {
    systemPrompt += `When responding, first show your reasoning process inside <thinking> tags, then provide your final response.

Format your response exactly like this:
<thinking>
Your step-by-step reasoning, analysis, and thought process goes here. Be thorough and show your work.
</thinking>

Your final response to the user goes here.

Important: Always include the <thinking> tags when thinking mode is enabled.`;
  }

  // Add general response length guidance
  systemPrompt += `\n\nResponse Length Guidance: Keep responses conversational and appropriately sized. For simple questions, provide brief, natural answers (1-3 sentences). Only expand into detailed analysis when the user specifically requests comprehensive explanations, detailed reports, or step-by-step breakdowns.`;

  return systemPrompt;
}

// Streaming version that handles both thinking and content in real-time
export async function* streamGrokEnhanced(
  messages: Array<{ role: string; content: string }>,
  options: GrokEnhancedOptions = {}
): AsyncGenerator<GrokStreamChunk> {
  const {
    realTimeData = false,
    thinkingMode = false,
    temperature = 0.7,
    maxTokens = 4096,
    model = "grok-3",
  } = options;

  let thinkingManager: ThinkingManager | null = null;

  // Create thinking manager if stepId and convexClient are provided
  if (options.stepId && options.convexClient) {
    try {
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider: "xai",
        model: model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager for Grok:", error);
    }
  }

  try {
    const systemPrompt = buildEnhancedSystemPrompt(options);

    const enhancedMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    // Start thinking simulation if thinking mode is enabled and manager is available
    if (thinkingMode && thinkingManager) {
      // Start thinking simulation in background (don't yield here)
      const thinkingPromise = (async () => {
        try {
          for await (const thinkingChunk of thinkingManager.generateThinkingStream()) {
            // Thinking updates are handled internally by the manager
          }
        } catch (error) {
          console.error("Grok thinking simulation error:", error);
        }
      })();
    }

    const stream = await streamText({
      model: xai(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
    });

    let fullContent = "";
    let thinkingContent = "";
    let responseContent = "";
    let inThinking = false;
    let thinkingComplete = false;
    let hasStartedContent = false;

    for await (const chunk of stream.textStream) {
      fullContent += chunk;

      if (options.thinkingMode) {
        // Check if we're entering thinking mode
        if (!inThinking && fullContent.includes("<thinking>")) {
          inThinking = true;
          const thinkingStart = fullContent.indexOf("<thinking>") + 11;
          thinkingContent = fullContent.substring(thinkingStart);

          // Yield thinking start
          yield {
            type: "thinking",
            thinking: "",
          };
        }

        // If we're in thinking mode, accumulate thinking content
        if (inThinking && !thinkingComplete) {
          if (fullContent.includes("</thinking>")) {
            // Thinking is complete
            const thinkingEnd = fullContent.indexOf("</thinking>");
            const thinkingStart = fullContent.indexOf("<thinking>") + 11;
            thinkingContent = fullContent.substring(thinkingStart, thinkingEnd);
            thinkingComplete = true;
            inThinking = false;

            // Update thinking via manager if available
            if (thinkingManager) {
              await thinkingManager.completeThinking(thinkingContent);
            }

            // Yield complete thinking
            yield {
              type: "thinking",
              thinking: thinkingContent,
            };

            // Start yielding response content
            const responseStart = thinkingEnd + 12; // "</thinking>".length
            responseContent = fullContent.substring(responseStart).trim();

            if (responseContent) {
              hasStartedContent = true;
              yield {
                type: "content",
                content: responseContent,
              };
            }
          } else {
            // Still in thinking, yield partial thinking
            const thinkingStart = fullContent.indexOf("<thinking>") + 11;
            thinkingContent = fullContent.substring(thinkingStart);

            // Update thinking via manager if available
            if (thinkingManager) {
              await thinkingManager.queueUpdate("thinking", {
                thinking: thinkingContent,
                isThinking: true,
              });
            }

            yield {
              type: "thinking",
              thinking: thinkingContent,
            };
          }
        } else if (thinkingComplete) {
          // Thinking is done, yield response content
          const thinkingEnd = fullContent.indexOf("</thinking>");
          const responseStart = thinkingEnd + 12;
          responseContent = fullContent.substring(responseStart).trim();

          if (!hasStartedContent) {
            hasStartedContent = true;
            if (thinkingManager) {
              await thinkingManager.completeThinking(thinkingContent);
            }
          }

          // Update stream content via manager if available
          if (thinkingManager) {
            await thinkingManager.updateStreamContent(responseContent);
          }

          yield {
            type: "content",
            content: responseContent,
          };
        }
      } else {
        // No thinking mode, just stream content directly
        if (!hasStartedContent) {
          hasStartedContent = true;
          if (thinkingManager) {
            // Complete any background thinking simulation
            await thinkingManager.completeThinking();
          }
        }

        // Update stream content via manager if available
        if (thinkingManager) {
          await thinkingManager.updateStreamContent(fullContent);
        }

        yield {
          type: "content",
          content: fullContent,
        };
      }
    }

    // Yield completion with usage stats
    const usage = await stream.usage;
    yield {
      type: "complete",
      content: options.thinkingMode ? responseContent : fullContent,
      thinking: options.thinkingMode ? thinkingContent : undefined,
      usage: usage
        ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : undefined,
    };
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

// Non-streaming version for backward compatibility
export async function callGrokEnhanced(
  messages: Array<{ role: string; content: string }>,
  options: GrokEnhancedOptions = {}
): Promise<GrokEnhancedResponse> {
  const {
    realTimeData = false,
    thinkingMode = false,
    temperature = 0.7,
    maxTokens = 4096,
    model = "grok-3",
  } = options;

  const systemPrompt = buildEnhancedSystemPrompt(options);

  const enhancedMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const result = await generateText({
      model: xai(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
    });

    let thinking: string | undefined;
    let content = result.text;

    // Extract thinking content if present
    if (
      thinkingMode &&
      content.includes("<thinking>") &&
      content.includes("</thinking>")
    ) {
      const thinkingStart = content.indexOf("<thinking>") + 11;
      const thinkingEnd = content.indexOf("</thinking>");
      thinking = content.substring(thinkingStart, thinkingEnd);

      const responseStart = thinkingEnd + 12; // "</thinking>".length
      content = content.substring(responseStart).trim();
    }

    return {
      content,
      thinking,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Grok enhanced call failed:", error);
    throw new Error(
      `Grok enhanced call failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
