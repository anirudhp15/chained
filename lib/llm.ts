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

function buildEnhancedPrompt(input: MultimodalInput): string {
  let enhancedPrompt = input.prompt;

  // Add audio transcription context
  if (input.audioTranscription) {
    enhancedPrompt = `[Audio Transcription]: "${input.audioTranscription}"\n\n${enhancedPrompt}`;
  }

  // Add web search context
  if (input.webSearchResults && input.webSearchResults.length > 0) {
    const searchContext = input.webSearchResults
      .map(
        (result, index) =>
          `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.source || new URL(result.url).hostname}`
      )
      .join("\n\n");

    enhancedPrompt = `[Web Search Results]:\n${searchContext}\n\n[User Query]: ${enhancedPrompt}`;
  }

  return enhancedPrompt;
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

  // Add images if provided and model supports vision
  if (images && images.length > 0) {
    for (const image of images) {
      // For Anthropic, we need to fetch the image and convert to base64
      try {
        const response = await fetch(image.url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";

        content.push({
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
        });
      } catch (error) {
        console.error("Failed to process image for Anthropic:", error);
        // Continue without this image
      }
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

        // Update stream content through thinking manager if available
        if (thinkingManager) {
          await thinkingManager.updateStreamContent(fullContent);
        }

        yield { content: delta.content };
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
    });

    let fullContent = "";
    let tokenUsage: any = undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;

        // Update stream content through thinking manager if available
        if (thinkingManager) {
          await thinkingManager.updateStreamContent(fullContent);
        }

        yield { content: delta.content };
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

  // Add images if provided and model supports vision
  if (images && images.length > 0) {
    for (const image of images) {
      try {
        const response = await fetch(image.url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";

        content.push({
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
        });
      } catch (error) {
        console.error("Failed to process image for Anthropic:", error);
      }
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

      // Update stream content through thinking manager if available
      if (thinkingManager) {
        await thinkingManager.updateStreamContent(fullContent);
      }

      yield { content: chunk.delta.text };
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

      // Update stream content through thinking manager if available
      if (thinkingManager) {
        await thinkingManager.updateStreamContent(fullContent);
      }

      yield { content: delta.content };
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
