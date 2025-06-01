import { streamLLM } from "./llm-stream";
import type { Id } from "../convex/_generated/dataModel";

export interface InternalExecutionParams {
  model: string;
  prompt: string;
  sessionId: Id<"chatSessions">;
  agentIndex: number;
}

export async function executeAgentInternally({
  model,
  prompt,
  sessionId,
  agentIndex,
}: InternalExecutionParams): Promise<string> {
  let response = "";

  // Direct LLM call without creating agentStep
  await streamLLM({
    model,
    prompt,
    onChunk: async (chunk: string) => {
      response += chunk;
      // No streaming to UI for internal execution
    },
    onComplete: async () => {
      // Internal execution complete
    },
    onError: async (error: Error) => {
      console.error(
        `Internal agent execution failed for agent ${agentIndex}:`,
        error
      );
      throw error;
    },
  });

  return response;
}
