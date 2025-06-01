// Model pricing per 1K tokens (updated 2025)
const MODEL_PRICING = {
  // OpenAI Models - Reasoning Models (High Priority)
  o1: { input: 0.015, output: 0.06 }, // $15/MTok input, $60/MTok output
  "o1-mini": { input: 0.003, output: 0.012 }, // $3/MTok input, $12/MTok output
  "o1-pro": { input: 0.06, output: 0.24 }, // $60/MTok input, $240/MTok output

  // OpenAI Flagship Models
  "gpt-4o": { input: 0.0025, output: 0.01 }, // $2.50/MTok input, $10/MTok output
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 }, // $0.15/MTok input, $0.60/MTok output

  // OpenAI Latest Models (estimated pricing)
  "gpt-4.5-preview": { input: 0.01, output: 0.03 }, // Estimated premium pricing
  "gpt-4.1": { input: 0.005, output: 0.015 }, // Estimated mid-tier pricing

  // OpenAI Specialized Models
  "o3-mini-2025-01-31": { input: 0.004, output: 0.016 }, // Estimated next-gen pricing
  "o4-mini-2025-04-16": { input: 0.005, output: 0.02 }, // Estimated latest-gen pricing

  // Anthropic Claude 4 Series
  "claude-opus-4-20250514": { input: 0.015, output: 0.075 }, // $15/MTok input, $75/MTok output
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output

  // Anthropic Claude 3.7 Series
  "claude-3-7-sonnet-20250219": { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output

  // Anthropic Claude 3.5 Series (Proven)
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output
  "claude-3-5-haiku-20241022": { input: 0.0008, output: 0.004 }, // $0.80/MTok input, $4/MTok output

  // xAI Grok 3 Series
  "grok-3": { input: 0.003, output: 0.015 }, // $3/MTok input, $15/MTok output
  "grok-3-mini": { input: 0.0003, output: 0.0005 }, // $0.30/MTok input, $0.50/MTok output
  "grok-3-fast": { input: 0.005, output: 0.025 }, // $5/MTok input, $25/MTok output
  "grok-3-mini-fast": { input: 0.0006, output: 0.004 }, // $0.60/MTok input, $4/MTok output

  // xAI Grok 2 Series
  "grok-2-vision-1212": { input: 0.002, output: 0.01 }, // $2/MTok input, $10/MTok output (with image support)
  "grok-2-1212": { input: 0.002, output: 0.01 }, // $2/MTok input, $10/MTok output
};

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
    // OpenAI Models
    o1: "o1",
    "o1-mini": "o1 Mini",
    "o1-pro": "o1 Pro",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4.5-preview": "GPT-4.5 Preview",
    "gpt-4.1": "GPT-4.1",
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
