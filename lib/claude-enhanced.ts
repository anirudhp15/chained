import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import {
  createThinkingManager,
  type ThinkingManager,
} from "./thinking-manager";
import type { Id } from "../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

export type ClaudeModel =
  | "claude-opus-4-20250514"
  | "claude-sonnet-4-20250514"
  | "claude-3-7-sonnet-20250219"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022";

export interface ClaudeEnhancedOptions {
  fileAttachments?: Array<{
    name: string;
    content: string;
    mimeType: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  model?: ClaudeModel;
  enableTools?: boolean;
  stepId?: Id<"agentSteps">;
  convexClient?: ConvexHttpClient;
}

export interface ClaudeEnhancedResponse {
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

export interface ClaudeStreamChunk {
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

// Tool definitions for use with AI SDK
export const CLAUDE_TOOLS = {
  web_search: {
    description: "Search the web for current information",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "The search query",
        },
        max_results: {
          type: "number" as const,
          description: "Maximum number of results to return",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  analyze_file: {
    description: "Analyze uploaded files for content, structure, and insights",
    parameters: {
      type: "object" as const,
      properties: {
        file_name: {
          type: "string" as const,
          description: "Name of the file to analyze",
        },
        analysis_type: {
          type: "string" as const,
          enum: ["content", "structure", "summary", "code_review"],
          description: "Type of analysis to perform",
        },
      },
      required: ["file_name", "analysis_type"],
    },
  },
  computer_use: {
    description:
      "Use a computer to perform tasks like taking screenshots, clicking, typing, etc.",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string" as const,
          enum: ["screenshot", "click", "type", "scroll", "key"],
          description: "The action to perform",
        },
        coordinate: {
          type: "array" as const,
          items: { type: "number" as const },
          description: "X, Y coordinates for click actions",
        },
        text: {
          type: "string" as const,
          description: "Text to type",
        },
      },
      required: ["action"],
    },
  },
};

export async function callClaudeWithTools(
  messages: Array<{ role: string; content: string }>,
  options: ClaudeEnhancedOptions = {}
): Promise<ClaudeEnhancedResponse> {
  const {
    fileAttachments = [],
    temperature = 0.7,
    maxTokens = 4096,
    model = "claude-sonnet-4-20250514",
  } = options;

  let thinkingManager: ThinkingManager | null = null;

  // Create thinking manager if stepId and convexClient are provided
  if (options.stepId && options.convexClient) {
    try {
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider: "anthropic",
        model: model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager for Claude:", error);
    }
  }

  try {
    // Prepare messages with file attachments
    const enhancedMessages = [...messages];

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
          console.error("Claude thinking simulation error:", error);
        }
      })();
    }

    const result = await generateText({
      model: anthropic(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
      // Note: Tools would be added here when implementing specific tool calling
      // tools: { web_search: CLAUDE_TOOLS.web_search },
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
        result: undefined, // Tool results would be handled separately
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
    console.error("Claude enhanced call failed:", error);
    throw new Error(
      `Claude enhanced call failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

export async function* streamClaudeWithTools(
  messages: Array<{ role: string; content: string }>,
  options: ClaudeEnhancedOptions = {}
): AsyncGenerator<ClaudeStreamChunk> {
  const {
    fileAttachments = [],
    temperature = 0.7,
    maxTokens = 4096,
    model = "claude-sonnet-4-20250514",
  } = options;

  let thinkingManager: ThinkingManager | null = null;

  // Create thinking manager if stepId and convexClient are provided
  if (options.stepId && options.convexClient) {
    try {
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider: "anthropic",
        model: model,
      });
    } catch (error) {
      console.warn("Could not create thinking manager for Claude:", error);
    }
  }

  try {
    // Prepare messages with file attachments
    const enhancedMessages = [...messages];

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
          console.error("Claude thinking simulation error:", error);
        }
      })();
    }

    const stream = await streamText({
      model: anthropic(model),
      messages: enhancedMessages as any,
      temperature,
      maxTokens,
      // Note: Tools would be added here when implementing specific tool calling
      // tools: { web_search: CLAUDE_TOOLS.web_search },
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
    console.error("Claude enhanced streaming failed:", error);
    throw new Error(
      `Claude enhanced streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

// Predefined tool sets for common use cases
export const CLAUDE_TOOL_SETS = {
  webSearch: { web_search: CLAUDE_TOOLS.web_search },
  fileAnalysis: { analyze_file: CLAUDE_TOOLS.analyze_file },
  computerUse: { computer_use: CLAUDE_TOOLS.computer_use },
  full: {
    web_search: CLAUDE_TOOLS.web_search,
    analyze_file: CLAUDE_TOOLS.analyze_file,
    computer_use: CLAUDE_TOOLS.computer_use,
  },
};

// Helper function to process file uploads for Claude
export function processFileForClaude(file: File): Promise<{
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
