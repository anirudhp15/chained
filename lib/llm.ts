import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  createThinkingManager,
  getProviderFromModel,
  type ThinkingManager,
} from "./thinking-manager";
import type { Id } from "../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// xAI client setup
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface MultimodalInput {
  prompt: string;
  images?: Array<{
    url: string;
    description?: string;
  }>;
  audioTranscription?: string;
  webSearchResults?: Array<{
    title: string;
    snippet: string;
    url: string;
    source?: string;
  }>;
}

interface LLMResponse {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMStreamOptions {
  stepId?: Id<"agentSteps">;
  convexClient?: ConvexHttpClient;
  enableThinking?: boolean;
}

// Model Personalities System
const MODEL_PERSONALITIES = {
  "gpt-4o": {
    personality:
      "You are an expert strategist with deep analytical thinking. You excel at breaking down complex problems and providing actionable insights. Be precise, data-driven, and solution-oriented. Your responses should feel like insights from a top management consultant.\n\n**Response Length:** Keep responses brief and conversational (2-4 sentences) unless the user specifically asks for detailed analysis, comprehensive reports, or long-form content. Match the user's energy - if they ask a quick question, give a quick answer.",
    prefix: "**Strategic Analysis:**\n",
  },
  "gpt-4o-mini": {
    personality:
      "You are a rapid-fire problem solver with sharp efficiency. You excel at quick analysis and clear, concise solutions. Be direct, practical, and action-oriented. Get to the point fast.\n\n**Response Length:** Default to very brief responses (1-3 sentences) unless the user explicitly requests more detail. Think of yourself as giving quick, punchy insights.",
    prefix: "**Quick Analysis:**\n",
  },
  "claude-3-5-sonnet-20241022": {
    personality:
      "You are a thoughtful, nuanced thinker who excels at understanding context and providing balanced perspectives. You're excellent at code analysis and ethical reasoning. Be thorough, consider multiple angles, and show sophisticated understanding.\n\n**Response Length:** Aim for concise but thoughtful responses (2-4 sentences) unless the user asks for detailed explanations, code reviews, or comprehensive analysis. Be conversational and natural.",
    prefix: "**Thoughtful Response:**\n",
  },
  "claude-3-5-haiku-20241022": {
    personality:
      "You are a swift, elegant problem solver with poetic precision. You excel at distilling complex ideas into clear, beautiful insights. Be concise but profound, elegant in your explanations.\n\n**Response Length:** Keep responses elegantly brief (1-3 sentences) unless the user specifically requests detailed explanations. Think haiku-like precision - maximum insight in minimum words.",
    prefix: "**Elegant Insight:**\n",
  },
  "claude-sonnet-4-20250514": {
    personality:
      "You are a thoughtful, nuanced thinker who excels at understanding context and providing balanced perspectives. You're excellent at code analysis and ethical reasoning. Be thorough, consider multiple angles, and show sophisticated understanding.\n\n**Response Length:** Aim for concise but thoughtful responses (2-4 sentences) unless the user asks for detailed explanations, code reviews, or comprehensive analysis. Be conversational and natural.",
    prefix: "**Thoughtful Response:**\n",
  },
  "claude-opus-4-20250514": {
    personality:
      "You are the most capable and intelligent Claude model with superior reasoning abilities. You excel at the most complex analysis, advanced problem solving, and sophisticated reasoning. Be thorough yet elegant, showing deep understanding while remaining accessible.\n\n**Response Length:** Provide thoughtful, well-reasoned responses (2-5 sentences) unless the user asks for comprehensive analysis or detailed explanations. Balance depth with clarity.",
    prefix: "**Superior Analysis:**\n",
  },
  "claude-3-7-sonnet-20250219": {
    personality:
      "You are an enhanced model with extended thinking capabilities and deep analytical skills. You excel at complex reasoning, nuanced analysis, and thoughtful problem-solving. Show sophisticated understanding while being practical and actionable.\n\n**Response Length:** Provide thoughtful but concise responses (2-4 sentences) unless the user requests extended analysis or detailed explanations. Think deeply but communicate clearly.",
    prefix: "**Extended Analysis:**\n",
  },
  "grok-3": {
    personality:
      "You are a cutting-edge AI with real-time awareness and a slightly witty, confident tone. You excel at current events, market intelligence, and providing fresh perspectives. Be bold, insightful, and occasionally witty. You have access to the latest information.\n\n**Response Length:** Keep responses snappy and engaging (2-3 sentences) unless the user asks for detailed market analysis or comprehensive reports. Sound like a smart friend sharing insights, not a formal analyst.",
    prefix: "**Real-time Insight:**\n",
  },
  "grok-3-mini": {
    personality:
      "You are a quick, street-smart AI with real-time awareness. You excel at rapid market insights and current trend analysis. Be snappy, confident, and always current. Think like a savvy trader or news analyst.\n\n**Response Length:** Default to very brief, punchy responses (1-2 sentences) unless the user specifically requests detailed analysis. Think Twitter-length insights with maximum impact.",
    prefix: "**Live Update:**\n",
  },
  "grok-3-fast": {
    personality:
      "You are optimized for speed and real-time applications with lightning-fast processing. You excel at rapid responses, quick insights, and immediate analysis. Be direct, efficient, and always current.\n\n**Response Length:** Keep responses very brief and to-the-point (1-2 sentences) unless the user explicitly asks for more detail. Prioritize speed and clarity over elaboration.",
    prefix: "**Fast Insight:**\n",
  },
  "grok-3-mini-fast": {
    personality:
      "You are the perfect balance of speed and cost-effectiveness with reliable performance. You excel at quick, accurate responses and efficient problem-solving. Be concise, reliable, and practical.\n\n**Response Length:** Default to brief, efficient responses (1-2 sentences) unless the user requests more detail. Think of yourself as giving quick, reliable answers.",
    prefix: "**Quick Response:**\n",
  },
  "grok-2-vision-1212": {
    personality:
      "You are specialized in advanced image understanding and visual analysis. You excel at interpreting images, visual data, and multimodal reasoning. Be precise in your visual descriptions and insightful in your analysis.\n\n**Response Length:** Provide focused visual analysis (2-4 sentences) unless the user asks for detailed image descriptions or comprehensive visual breakdowns. Be clear and descriptive.",
    prefix: "**Visual Analysis:**\n",
  },
  "grok-2-1212": {
    personality:
      "You are a proven model for text analysis and logical reasoning. You excel at understanding context, logical problem-solving, and clear communication. Be reliable, thoughtful, and well-reasoned in your responses.\n\n**Response Length:** Provide clear, logical responses (2-3 sentences) unless the user requests detailed analysis or step-by-step reasoning. Focus on clarity and logic.",
    prefix: "**Logical Analysis:**\n",
  },
  "o1-preview": {
    personality:
      "You are a systematic reasoning engine with deep logical thinking. You excel at mathematical thinking, logical analysis, and step-by-step problem solving. Show your reasoning process clearly and be methodical in your approach.\n\n**Response Length:** For simple questions, provide brief but clear reasoning (2-4 sentences). For complex problems, show your full reasoning process only when the user asks for detailed analysis or step-by-step solutions.",
    prefix: "**Reasoning Process:**\n",
  },
  o1: {
    personality:
      "You are a systematic reasoning engine with deep logical thinking. You excel at mathematical thinking, logical analysis, and step-by-step problem solving. Show your reasoning process clearly and be methodical in your approach.\n\n**Response Length:** For simple questions, provide brief but clear reasoning (2-4 sentences). For complex problems, show your full reasoning process only when the user asks for detailed analysis or step-by-step solutions.",
    prefix: "**Reasoning Process:**\n",
  },
  "o3-mini-2025-01-31": {
    personality:
      "You are a next-generation reasoning model with advanced capabilities and efficient processing. You excel at complex reasoning, mathematical analysis, and systematic problem-solving with optimized performance.\n\n**Response Length:** Provide efficient reasoning (2-4 sentences) for most queries. Expand into detailed analysis only when users specifically request comprehensive problem-solving or mathematical breakdowns.",
    prefix: "**Next-Gen Reasoning:**\n",
  },
  o3: {
    personality:
      "You are an advanced reasoning system with exceptional logical capabilities. You excel at complex problem solving, mathematical analysis, and systematic thinking. Demonstrate clear reasoning chains and methodical approaches.\n\n**Response Length:** Keep reasoning concise for straightforward questions (2-4 sentences). Expand into detailed analysis only when the user explicitly requests comprehensive problem-solving or step-by-step breakdowns.",
    prefix: "**Advanced Reasoning:**\n",
  },
  "o4-mini-2025-04-16": {
    personality:
      "You are the latest generation reasoning model with state-of-the-art capabilities and optimized performance. You excel at the most sophisticated logical challenges, complex analysis, and advanced problem-solving.\n\n**Response Length:** Provide focused, efficient reasoning (2-4 sentences) for standard queries. Reserve extensive analysis for when users explicitly request detailed problem-solving or comprehensive logical breakdowns.",
    prefix: "**State-of-the-Art Reasoning:**\n",
  },
  o4: {
    personality:
      "You are a next-generation reasoning system with superior analytical capabilities. You excel at the most complex logical challenges, advanced mathematics, and sophisticated problem solving. Show deep reasoning and systematic analysis.\n\n**Response Length:** Provide focused, efficient reasoning for simple queries (2-4 sentences). Reserve extensive analysis for when users specifically request detailed problem-solving or comprehensive logical breakdowns.",
    prefix: "**Superior Reasoning:**\n",
  },
};

function getModelPersonality(modelName: string): {
  personality: string;
  prefix: string;
} {
  // Clean model name for lookup
  const cleanModelName = modelName
    .replace("openai-", "")
    .replace("anthropic-", "")
    .replace("xai-", "");

  return (
    MODEL_PERSONALITIES[cleanModelName as keyof typeof MODEL_PERSONALITIES] || {
      personality:
        "You are a helpful AI assistant focused on providing accurate and useful responses.",
      prefix: "**Response:**\n",
    }
  );
}

// Chain-Aware Context Builder
function buildChainContextPrompt(
  userPrompt: string,
  previousResponse: string,
  connectionType: string,
  agentIndex: number,
  totalAgents: number
): string {
  const connectionPrompts: Record<string, string> = {
    direct: `**Building on Previous Work:**\n${previousResponse}\n\n---\n\n**Your Task:** ${userPrompt}`,

    conditional: `**Previous Analysis Completed:**\n${previousResponse}\n\n---\n\n**Conditional Task:** ${userPrompt}\n\n*Only proceed if the conditions from the previous analysis are met.*`,

    parallel: `**Parallel Processing Mode:**\nYou're working alongside other agents on: ${userPrompt}\n\n**Context from parallel agent:**\n${previousResponse}`,
  };

  const rolePrompts: Record<string, string> = {
    first:
      "**Foundation Agent** - You're starting this chain. Set a strong, comprehensive foundation for the agents that follow. Your analysis will guide the entire workflow. Keep your response focused and actionable unless the user specifically requests detailed analysis.",
    middle: `**Bridge Agent** (${agentIndex + 1}/${totalAgents}) - Build meaningfully on the previous work while preparing valuable insights for the next agent. You're a crucial link in this chain. Provide concise, valuable insights that advance the workflow.`,
    final:
      "**Synthesis Agent** - You're the final agent in this chain. Synthesize everything into actionable conclusions, clear next steps, and compelling final recommendations. Be comprehensive but focused on practical outcomes.",
  };

  let role = "middle";
  if (agentIndex === 0) role = "first";
  if (agentIndex === totalAgents - 1) role = "final";

  return `${rolePrompts[role]}\n\n${connectionPrompts[connectionType] || connectionPrompts.direct}`;
}

export async function callLLM({
  model,
  prompt,
  images,
  audioTranscription,
  webSearchResults,
}: {
  model: string;
  prompt: string;
  images?: Array<{ url: string; description?: string }>;
  audioTranscription?: string;
  webSearchResults?: Array<{
    title: string;
    snippet: string;
    url: string;
    source?: string;
  }>;
}): Promise<LLMResponse> {
  try {
    // Build enhanced prompt with multimodal context
    const enhancedPrompt = buildEnhancedPrompt({
      prompt,
      images,
      audioTranscription,
      webSearchResults,
    });

    if (
      model.startsWith("gpt-") ||
      model.includes("openai") ||
      model.startsWith("o1") ||
      model.startsWith("o3") ||
      model.startsWith("o4")
    ) {
      return await callOpenAI(model, enhancedPrompt, images);
    }

    if (model.includes("claude")) {
      return await callAnthropic(model, enhancedPrompt, images);
    }

    if (model.startsWith("grok-") || model.includes("xai")) {
      return await callXAI(model, enhancedPrompt, images);
    }

    throw new Error(`Unsupported model: ${model}`);
  } catch (error) {
    console.error("LLM call failed:", error);
    return {
      content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function* callLLMStream({
  model,
  prompt,
  images,
  audioTranscription,
  webSearchResults,
  options,
}: {
  model: string;
  prompt: string;
  images?: Array<{ url: string; description?: string }>;
  audioTranscription?: string;
  webSearchResults?: Array<{
    title: string;
    snippet: string;
    url: string;
    source?: string;
  }>;
  options?: LLMStreamOptions;
}): AsyncGenerator<{
  content: string;
  isComplete?: boolean;
  tokenUsage?: any;
  thinking?: string;
  isThinking?: boolean;
}> {
  let thinkingManager: ThinkingManager | null = null;

  try {
    // Initialize thinking manager if needed
    if (
      options?.stepId &&
      options?.convexClient &&
      options?.enableThinking !== false
    ) {
      const provider = getProviderFromModel(model);
      thinkingManager = createThinkingManager({
        stepId: options.stepId,
        convexClient: options.convexClient,
        provider,
        model,
      });
    }

    // Build enhanced prompt with multimodal context
    const enhancedPrompt = buildEnhancedPrompt({
      prompt,
      images,
      audioTranscription,
      webSearchResults,
    });

    if (
      model.startsWith("gpt-") ||
      model.includes("openai") ||
      model.startsWith("o1") ||
      model.startsWith("o3") ||
      model.startsWith("o4")
    ) {
      yield* callOpenAIStream(model, enhancedPrompt, images, thinkingManager);
    } else if (model.includes("claude")) {
      yield* callAnthropicStream(
        model,
        enhancedPrompt,
        images,
        thinkingManager
      );
    } else if (model.startsWith("grok-") || model.includes("xai")) {
      yield* callXAIStream(model, enhancedPrompt, images, thinkingManager);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error) {
    console.error("LLM stream call failed:", error);
    yield {
      content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      isComplete: true,
    };
  } finally {
    // Clean up thinking manager
    if (thinkingManager) {
      await thinkingManager.cleanup();
    }
  }
}

function buildEnhancedPrompt(
  input: MultimodalInput & {
    model?: string;
    chainContext?: {
      previousResponse?: string;
      connectionType?: string;
      agentIndex?: number;
      totalAgents?: number;
    };
  }
): string {
  let enhancedPrompt = input.prompt;

  // Add chain context if available
  if (
    input.chainContext?.previousResponse &&
    input.chainContext?.connectionType
  ) {
    enhancedPrompt = buildChainContextPrompt(
      enhancedPrompt,
      input.chainContext.previousResponse,
      input.chainContext.connectionType,
      input.chainContext.agentIndex || 0,
      input.chainContext.totalAgents || 1
    );
  }

  // Add personality and prefix
  const personality = getModelPersonality(input.model || "gpt-4o");

  if (input.audioTranscription) {
    enhancedPrompt = `**Audio Input Transcribed:** "${input.audioTranscription}"\n\n${enhancedPrompt}`;
  }

  if (input.webSearchResults && input.webSearchResults.length > 0) {
    const searchContext = input.webSearchResults
      .map(
        (result, index) =>
          `${index + 1}. **${result.title}**\n   ${result.snippet}\n   ${result.source || new URL(result.url).hostname}\n   ${result.url}`
      )
      .join("\n\n");

    enhancedPrompt = `**Live Web Research Results:**\n${searchContext}\n\n**Your Task:** ${enhancedPrompt}`;
  }

  if (input.images && input.images.length > 0) {
    enhancedPrompt = `**Visual Context:** ${input.images.length} image(s) provided for analysis\n\n${enhancedPrompt}`;
  }

  // Add model personality to the prompt
  return `${personality.personality}\n\n${personality.prefix}${enhancedPrompt}`;
}

async function callOpenAI(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>
): Promise<LLMResponse> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (images && images.length > 0) {
    // For vision-capable models, include images
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
    ];

    images.forEach((image) => {
      content.push({
        type: "image_url",
        image_url: {
          url: image.url,
          detail: "high",
        },
      });
    });

    messages.push({
      role: "user",
      content: content,
    });
  } else {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  // Check if this is a reasoning model
  const isReasoningModel =
    model.includes("o1") || model.includes("o3") || model.includes("o4");

  const apiParams: any = {
    model: model.replace("openai-", ""),
    messages,
  };

  // Use max_completion_tokens for reasoning models instead of max_tokens
  if (isReasoningModel) {
    apiParams.max_completion_tokens = 4000;
  } else {
    apiParams.max_tokens = 4000;
  }

  const response = await openai.chat.completions.create(apiParams);

  const usage = response.usage;
  return {
    content: response.choices[0]?.message?.content || "",
    tokenUsage: usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined,
  };
}

async function callAnthropic(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>
): Promise<LLMResponse> {
  const content: Anthropic.MessageParam["content"] = [];

  // Add text content
  content.push({
    type: "text",
    text: prompt,
  });

  // Add images if provided and model supports vision - PARALLEL PROCESSING
  if (images && images.length > 0) {
    try {
      const processedImages = await processImagesParallel(images);
      content.push(...processedImages);
    } catch (error) {
      console.error("Failed to process images for Anthropic:", error);
      // Continue without images
    }
  }

  const message = await anthropic.messages.create({
    model: model,
    max_tokens: 4000,
    messages: [{ role: "user", content }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  const usage = message.usage;

  return {
    content: textContent?.text || "No response generated",
    tokenUsage: usage
      ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        }
      : undefined,
  };
}

async function callXAI(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>
): Promise<LLMResponse> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (images && images.length > 0) {
    // For vision-capable Grok models, include images
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
    ];

    images.forEach((image) => {
      content.push({
        type: "image_url",
        image_url: {
          url: image.url,
          detail: "high",
        },
      });
    });

    messages.push({
      role: "user",
      content: content,
    });
  } else {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  const completion = await xai.chat.completions.create({
    model: model,
    messages,
    max_tokens: 4000,
  });

  const choice = completion.choices[0];
  const usage = completion.usage;

  return {
    content: choice?.message?.content || "No response generated",
    tokenUsage: usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined,
  };
}

async function* callOpenAIStream(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>,
  thinkingManager?: ThinkingManager | null
): AsyncGenerator<{
  content: string;
  isComplete?: boolean;
  tokenUsage?: any;
  thinking?: string;
  isThinking?: boolean;
}> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Check if this is a reasoning model
  const isReasoningModel =
    model.includes("o1") || model.includes("o3") || model.includes("o4");

  if (images && images.length > 0 && !isReasoningModel) {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
    ];

    images.forEach((image) => {
      content.push({
        type: "image_url",
        image_url: {
          url: image.url,
          detail: "high",
        },
      });
    });

    messages.push({
      role: "user",
      content: content,
    });
  } else {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  // For reasoning models with thinking manager, start thinking process
  if (isReasoningModel && thinkingManager) {
    // Start thinking simulation in background
    const thinkingPromise = (async () => {
      try {
        for await (const thinkingChunk of thinkingManager.generateThinkingStream()) {
          // Thinking updates are handled internally by the manager
        }
      } catch (error) {
        console.error("Thinking simulation error:", error);
      }
    })();

    // Create the actual API call
    const apiParams: any = {
      model: model.replace("openai-", ""),
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Use max_completion_tokens for reasoning models instead of max_tokens
    if (isReasoningModel) {
      apiParams.max_completion_tokens = 4000;
    } else {
      apiParams.max_tokens = 4000;
    }

    const stream = (await openai.chat.completions.create(apiParams)) as any;

    let fullContent = "";
    let tokenUsage: any = undefined;
    let hasStartedContent = false;

    // Process the stream
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        if (!hasStartedContent) {
          // First content received, complete thinking
          hasStartedContent = true;
          if (thinkingManager) {
            await thinkingManager.completeThinking();
          }
        }

        fullContent += delta.content;

        // STREAM-FIRST: Yield immediately, no blocking operations
        yield { content: delta.content };

        // Update stream content through thinking manager if available (non-blocking)
        if (thinkingManager) {
          // Don't await - make it non-blocking
          thinkingManager.updateStreamContent(fullContent).catch((error) => {
            console.error("Non-blocking stream content update failed:", error);
          });
        }
      }

      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
          reasoningTokens:
            chunk.usage.completion_tokens_details?.reasoning_tokens || 0,
        };
      }
    }

    yield { content: "", isComplete: true, tokenUsage };
  } else {
    // Regular non-reasoning model streaming
    const stream = await openai.chat.completions.create({
      model: model.replace("openai-", ""),
      messages,
      max_tokens: 4000,
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullContent = "";
    let tokenUsage: any = undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;

        // STREAM-FIRST: Yield immediately, no blocking operations
        yield { content: delta.content };

        // Update stream content through thinking manager if available (non-blocking)
        if (thinkingManager) {
          // Don't await - make it non-blocking
          thinkingManager.updateStreamContent(fullContent).catch((error) => {
            console.error("Non-blocking stream content update failed:", error);
          });
        }
      }

      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    yield { content: "", isComplete: true, tokenUsage };
  }
}

async function* callAnthropicStream(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>,
  thinkingManager?: ThinkingManager | null
): AsyncGenerator<{
  content: string;
  isComplete?: boolean;
  tokenUsage?: any;
  thinking?: string;
  isThinking?: boolean;
}> {
  // For Claude models, simulate thinking if manager is available
  if (thinkingManager) {
    // Start thinking simulation in background
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

  const content: Anthropic.MessageParam["content"] = [];

  // Add text content
  content.push({
    type: "text",
    text: prompt,
  });

  // Add images if provided and model supports vision - PARALLEL PROCESSING
  if (images && images.length > 0) {
    try {
      const processedImages = await processImagesParallel(images);
      content.push(...processedImages);
    } catch (error) {
      console.error("Failed to process images for Anthropic:", error);
      // Continue without images
    }
  }

  const stream = await anthropic.messages.create({
    model: model,
    max_tokens: 4000,
    messages: [{ role: "user", content }],
    stream: true,
  });

  let tokenUsage: any = undefined;
  let fullContent = "";
  let hasStartedContent = false;

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      if (!hasStartedContent) {
        // First content received, complete thinking
        hasStartedContent = true;
        if (thinkingManager) {
          await thinkingManager.completeThinking();
        }
      }

      fullContent += chunk.delta.text;

      // STREAM-FIRST: Yield immediately, no blocking operations
      yield { content: chunk.delta.text };

      // Update stream content through thinking manager if available (non-blocking)
      if (thinkingManager) {
        // Don't await - make it non-blocking
        thinkingManager.updateStreamContent(fullContent).catch((error) => {
          console.error("Non-blocking stream content update failed:", error);
        });
      }
    } else if (chunk.type === "message_delta" && chunk.usage) {
      tokenUsage = {
        promptTokens: chunk.usage.input_tokens || 0,
        completionTokens: chunk.usage.output_tokens || 0,
        totalTokens:
          (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0),
      };
    }
  }

  yield { content: "", isComplete: true, tokenUsage };
}

async function* callXAIStream(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>,
  thinkingManager?: ThinkingManager | null
): AsyncGenerator<{
  content: string;
  isComplete?: boolean;
  tokenUsage?: any;
  thinking?: string;
  isThinking?: boolean;
}> {
  // For Grok models, simulate thinking if manager is available
  if (thinkingManager) {
    // Start thinking simulation in background
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

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (images && images.length > 0) {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
    ];

    images.forEach((image) => {
      content.push({
        type: "image_url",
        image_url: {
          url: image.url,
          detail: "high",
        },
      });
    });

    messages.push({
      role: "user",
      content: content,
    });
  } else {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  const stream = await xai.chat.completions.create({
    model: model,
    messages,
    max_tokens: 4000,
    stream: true,
  });

  let tokenUsage: any = undefined;
  let fullContent = "";
  let hasStartedContent = false;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      if (!hasStartedContent) {
        // First content received, complete thinking
        hasStartedContent = true;
        if (thinkingManager) {
          await thinkingManager.completeThinking();
        }
      }

      fullContent += delta.content;

      // STREAM-FIRST: Yield immediately, no blocking operations
      yield { content: delta.content };

      // Update stream content through thinking manager if available (non-blocking)
      if (thinkingManager) {
        // Don't await - make it non-blocking
        thinkingManager.updateStreamContent(fullContent).catch((error) => {
          console.error("Non-blocking stream content update failed:", error);
        });
      }
    }

    if (chunk.usage) {
      tokenUsage = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
    }
  }

  yield { content: "", isComplete: true, tokenUsage };
}

// Parallel image processing helper
async function processImagesParallel(
  images: Array<{ url: string; description?: string }>
): Promise<any[]> {
  const imagePromises = images.map(async (image) => {
    try {
      const response = await fetch(image.url);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      return {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      };
    } catch (error) {
      console.error(`Failed to process image: ${error}`);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  return results.filter(Boolean);
}
