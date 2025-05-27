// Model pricing per 1K tokens (as of 2024)
const MODEL_PRICING = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.00025, output: 0.00125 },
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  "grok-beta": { input: 0.005, output: 0.015 }, // Estimated
} as const;

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Normalize model name for lookup
  const normalizedModel = model
    .toLowerCase()
    .replace(/^(openai-|anthropic-|xai-)/, "");

  const pricing = MODEL_PRICING[normalizedModel as keyof typeof MODEL_PRICING];
  if (!pricing) {
    // Default fallback pricing for unknown models
    console.warn(`Unknown model pricing for: ${model}, using default rates`);
    return (promptTokens / 1000) * 0.001 + (completionTokens / 1000) * 0.002;
  }

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;

  return Math.round((inputCost + outputCost) * 100000) / 100000; // Round to 5 decimal places
}

export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
    "claude-3-opus-20240229": "Claude 3 Opus",
    "grok-beta": "Grok Beta",
  };

  const normalizedModel = model
    .toLowerCase()
    .replace(/^(openai-|anthropic-|xai-)/, "");
  return displayNames[normalizedModel] || model;
}
