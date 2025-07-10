import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a smart default name for an agent based on its model and existing agents
 * @param model - The model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
 * @param existingAgents - Array of existing agents to check for name conflicts
 * @param currentAgentId - ID of the current agent (to exclude from count if updating)
 * @returns A smart default name like "ChatGPT-4o #1" or "Claude 3.5 Sonnet #2", or just "ChatGPT-4o" if only one
 */
export function generateSmartAgentName(
  model: string,
  existingAgents: Array<{ model: string; name?: string; id?: string }> = [],
  currentAgentId?: string
): string {
  const displayName = getModelDisplayName(model);

  // Find all agents with the same model (including current agent)
  const agentsWithSameModel = existingAgents.filter(
    (agent) => agent.model === model
  );

  // If there's only one agent with this model, don't show a number
  if (agentsWithSameModel.length <= 1) {
    return displayName;
  }

  // Sort agents with same model by their position in the original array to ensure consistent numbering
  const sortedSameModelAgents = agentsWithSameModel.sort((a, b) => {
    const indexA = existingAgents.findIndex((agent) => agent.id === a.id);
    const indexB = existingAgents.findIndex((agent) => agent.id === b.id);
    return indexA - indexB;
  });

  // Find the position of the current agent among agents with the same model
  const agentIndex = sortedSameModelAgents.findIndex(
    (agent) => agent.id === currentAgentId
  );

  // If agent not found (new agent), it gets the next number
  const agentNumber =
    agentIndex >= 0 ? agentIndex + 1 : sortedSameModelAgents.length + 1;

  // Return the smart default name with space before hashtag
  return `${displayName} #${agentNumber}`;
}

/**
 * Gets a human-readable display name for a model
 * @param model - The model identifier
 * @returns Human-readable model name
 */
function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    // OpenAI Models
    o1: "o1",
    "o1-mini": "o1 Mini",
    "o1-pro": "o1 Pro",
    "gpt-4o": "ChatGPT 4o",
    "gpt-4o-mini": "ChatGPT 4o Mini",
    "gpt-4.5-preview": "ChatGPT 4.5 Preview",
    "gpt-4.1": "ChatGPT 4.1",
    "o3-mini-2025-01-31": "o3 Mini",
    "o4-mini-2025-04-16": "o4 Mini",

    // Anthropic Models
    "claude-opus-4-20250514": "Claude Opus 4",
    "claude-sonnet-4-20250514": "Claude Sonnet 4",
    "claude-3-7-sonnet-20250219": "Claude Sonnet 3.7",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",

    // xAI Models
    "grok-3": "Grok 3",
    "grok-3-mini": "Grok 3 Mini",
    "grok-3-fast": "Grok 3 Fast",
    "grok-3-mini-fast": "Grok 3 Mini Fast",
    "grok-2-vision-1212": "Grok 2 Vision",
    "grok-2-1212": "Grok 2",
  };

  const normalizedModel = model
    .toLowerCase()
    .replace(/^(openai-|anthropic-|xai-)/, "");

  return displayNames[normalizedModel] || model;
}
