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
}: InternalExecutionParams): Promise<string> {
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

        // Mark execution as complete with final response
        if (stepId) {
          const endTime = Date.now();
          const executionDuration = endTime - startTime;

          await convexClient.mutation(api.mutations.updateAgentStep, {
            stepId,
            response,
            isComplete: true,
            isStreaming: false,
            tokenUsage,
          });

          // Clear streaming content
          await convexClient.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: "",
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
