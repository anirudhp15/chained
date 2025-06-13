import { streamLLM } from "./llm-stream";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface InternalExecutionParams {
  model: string;
  prompt: string;
  sessionId: Id<"chatSessions">;
  agentIndex: number;
  stepId?: Id<"agentSteps">; // Existing step to update
  convexClient?: ConvexHttpClient; // Optional pre-authenticated client
}

export interface InternalExecutionResult {
  response: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executionDuration?: number;
  error?: string;
}

export async function executeAgentInternally({
  model,
  prompt,
  sessionId,
  agentIndex,
  stepId,
  convexClient = convex,
  suppressResponseUpdate = false, // Flag for supervisor mode
}: InternalExecutionParams & {
  suppressResponseUpdate?: boolean;
}): Promise<string> {
  const startTime = Date.now();
  let response = "";
  let tokenUsage: any = undefined;

  try {
    // If we have a stepId, mark it as streaming and working
    if (stepId) {
      await convexClient.mutation(api.mutations.updateAgentStep, {
        stepId,
        isStreaming: true,
        isComplete: false,
        suppressResponseUpdate, // Use the flag to prevent response updates
      });

      // Set initial working status
      await convexClient.mutation(api.mutations.updateStreamedContent, {
        stepId,
        content: "🔄 Processing supervisor task...",
      });
    }

    // Execute LLM call with streaming updates to existing step
    await streamLLM({
      model,
      prompt,
      onChunk: async (chunk: string) => {
        response += chunk;

        // Update the existing agent step with streaming content
        if (stepId) {
          await convexClient.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: response,
          });
        }
      },
      onComplete: async (usage?: any) => {
        tokenUsage = usage;

        // SUPERVISOR MODE FIX: Don't set response field in agent step
        // The conversation history handles response display to prevent dual rendering
        if (stepId) {
          const endTime = Date.now();
          const executionDuration = endTime - startTime;

          await convexClient.mutation(api.mutations.updateAgentStep, {
            stepId,
            response, // The response will be ignored if suppressResponseUpdate is true
            isComplete: true,
            isStreaming: false,
            tokenUsage,
            suppressResponseUpdate, // Use the flag to prevent response updates
          });

          // Clear streaming content since conversation history handles display
          await convexClient.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: "", // Clear to prevent legacy fallback rendering
          });
        }
      },
      onError: async (error: Error) => {
        console.error(
          `Internal agent execution failed for agent ${agentIndex}:`,
          error
        );

        // Mark step as failed if we have a stepId
        if (stepId) {
          await convexClient.mutation(api.mutations.updateAgentStep, {
            stepId,
            error: error.message,
            isComplete: true,
            isStreaming: false,
          });

          // Clear streaming content
          await convexClient.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: "",
          });
        }

        throw error;
      },
    });

    return response;
  } catch (error) {
    console.error(`Internal execution failed for agent ${agentIndex}:`, error);
    throw error;
  }
}
