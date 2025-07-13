import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { z } from "zod";
import {
  createThinkingManager,
  type ThinkingManager,
} from "./thinking-manager";
import type { Id } from "../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { webSearchTool } from "./ai-tools";

export type GeminiModel =
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash";

export interface GeminiEnhancedOptions {
  fileAttachments?: Array<{
    name: string;
    content: string;
    mimeType: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  model?: GeminiModel;
  enableTools?: boolean;
  stepId?: Id<"agentSteps">;
  convexClient?: ConvexHttpClient;
}

export interface GeminiEnhancedResponse {
  content: string;
  thinking?: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
    result?: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GeminiStreamChunk {
  type: "content" | "tool_call" | "complete" | "thinking";
  content?: string;
  thinking?: string;
  toolCall?: {
    name: string;
    input: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callGeminiWithTools(
  messages: Array<{ role: string; content: string }>,
  options: GeminiEnhancedOptions = {}
): Promise<GeminiEnhancedResponse> {
  const {
    fileAttachments = [],
    temperature = 0.7,
    maxTokens = 4096,
    model = "gemini-1.5-pro",
    enableTools = true,
  } = options;

  let thinkingManager: ThinkingManager | null = null;

  // Create thinking manager if stepId and convexClient are provided
  if (options.stepId && options.convexClient) {
    try {
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider: "google",
        model: model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager for Gemini:", error);
    }
  }

  try {
    // Prepare messages with file attachments
    const enhancedMessages = [...messages];

    // Add LaTeX formatting system message if not present
    const hasSystemMessage = enhancedMessages.some(
      (msg) => msg.role === "system"
    );
    if (!hasSystemMessage) {
      enhancedMessages.unshift({
        role: "system",
        content: `**Mathematical Content Formatting Instructions:**
When your response contains mathematical expressions, equations, formulas, or calculations, format them using proper LaTeX syntax:
- Inline math: $x = 5$ or $E = mc^2$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
- Use proper LaTeX syntax: \\frac{}{}, \\sqrt{}, \\sum_{i=1}^{n}, \\int_{}^{}, etc.
- For modular arithmetic: $a \\equiv b \\pmod{n}$

This ensures mathematical content renders beautifully in the user interface.`,
      });
    }

    // Add file attachments to the last user message if any
    if (fileAttachments.length > 0 && enhancedMessages.length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      if (lastMessage.role === "user") {
        const fileContext = fileAttachments
          .map(
            (file) => `File: ${file.name} (${file.mimeType})\n${file.content}`
          )
          .join("\n\n");

        lastMessage.content = `${lastMessage.content}\n\nAttached files:\n${fileContext}`;
      }
    }

    // Start thinking simulation if manager is available
    if (thinkingManager) {
      const thinkingPromise = (async () => {
        try {
          for await (const thinkingChunk of thinkingManager.generateThinkingStream()) {
            // Thinking updates are handled internally by the manager
          }
        } catch (error) {
          console.error("Gemini thinking simulation error:", error);
        }
      })();
    }

    const result = await generateText({
      model: google(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
      tools: enableTools ? { web_search: webSearchTool } : undefined,
    });

    // Complete thinking if manager is available
    if (thinkingManager) {
      await thinkingManager.completeThinking();
    }

    return {
      content: result.text,
      toolCalls: result.toolCalls?.map((call) => ({
        name: call.toolName,
        input: call.args,
        result: undefined, // Tool results are handled by the AI SDK
      })),
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Gemini enhanced call failed:", error);
    throw new Error(
      `Gemini enhanced call failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

export async function* streamGeminiWithTools(
  messages: Array<{ role: string; content: string }>,
  options: GeminiEnhancedOptions = {}
): AsyncGenerator<GeminiStreamChunk> {
  const {
    fileAttachments = [],
    temperature = 0.7,
    maxTokens = 4096,
    model = "gemini-1.5-pro",
    enableTools = true,
  } = options;

  let thinkingManager: ThinkingManager | null = null;

  // Create thinking manager if stepId and convexClient are provided
  if (options.stepId && options.convexClient) {
    try {
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider: "google",
        model: model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager for Gemini:", error);
    }
  }

  try {
    // Prepare messages with file attachments
    const enhancedMessages = [...messages];

    // Add LaTeX formatting system message if not present
    const hasSystemMessage = enhancedMessages.some(
      (msg) => msg.role === "system"
    );
    if (!hasSystemMessage) {
      enhancedMessages.unshift({
        role: "system",
        content: `**Mathematical Content Formatting Instructions:**
When your response contains mathematical expressions, equations, formulas, or calculations, format them using proper LaTeX syntax:
- Inline math: $x = 5$ or $E = mc^2$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
- Use proper LaTeX syntax: \\frac{}{}, \\sqrt{}, \\sum_{i=1}^{n}, \\int_{}^{}, etc.
- For modular arithmetic: $a \\equiv b \\pmod{n}$

This ensures mathematical content renders beautifully in the user interface.`,
      });
    }

    // Add file attachments to the last user message if any
    if (fileAttachments.length > 0 && enhancedMessages.length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      if (lastMessage.role === "user") {
        const fileContext = fileAttachments
          .map(
            (file) => `File: ${file.name} (${file.mimeType})\n${file.content}`
          )
          .join("\n\n");

        lastMessage.content = `${lastMessage.content}\n\nAttached files:\n${fileContext}`;
      }
    }

    // Start thinking simulation if manager is available
    if (thinkingManager) {
      const thinkingPromise = (async () => {
        try {
          for await (const thinkingChunk of thinkingManager.generateThinkingStream()) {
            // Thinking updates are handled internally by the manager
          }
        } catch (error) {
          console.error("Gemini thinking simulation error:", error);
        }
      })();
    }

    const stream = await streamText({
      model: google(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
      tools: enableTools ? { web_search: webSearchTool } : undefined,
    });

    let fullContent = "";
    let hasStartedContent = false;

    for await (const chunk of stream.textStream) {
      if (!hasStartedContent) {
        hasStartedContent = true;
        if (thinkingManager) {
          await thinkingManager.completeThinking();
        }
      }

      fullContent += chunk;

      // Update stream content via manager if available
      if (thinkingManager) {
        await thinkingManager.updateStreamContent(fullContent);
      }

      yield {
        type: "content",
        content: chunk,
      };
    }

    // Check for tool calls
    const toolResults = await stream.toolResults;
    if (toolResults && toolResults.length > 0) {
      for (const toolResult of toolResults) {
        yield {
          type: "tool_call",
          toolCall: {
            name: toolResult.toolName,
            input: toolResult.args,
            result: toolResult.result,
          },
        };
      }
    }

    // Yield completion with usage stats
    const usage = await stream.usage;
    yield {
      type: "complete",
      content: fullContent,
      usage: usage
        ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Gemini enhanced streaming failed:", error);
    throw new Error(
      `Gemini enhanced streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

// Helper function to process file uploads for Gemini
export function processFileForGemini(file: File): Promise<{
  name: string;
  content: string;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve({
          name: file.name,
          content: reader.result,
          mimeType: file.type || "text/plain",
        });
      } else {
        // Handle binary files by converting to base64
        const base64 = btoa(
          new Uint8Array(reader.result as ArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        resolve({
          name: file.name,
          content: base64,
          mimeType: file.type || "application/octet-stream",
        });
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));

    // Try to read as text first, fallback to binary
    if (file.type.startsWith("text/") || file.type === "application/json") {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
