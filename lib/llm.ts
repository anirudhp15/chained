import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

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

    if (model.startsWith("gpt-") || model.includes("openai")) {
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
}): AsyncGenerator<{
  content: string;
  isComplete?: boolean;
  tokenUsage?: any;
}> {
  try {
    // Build enhanced prompt with multimodal context
    const enhancedPrompt = buildEnhancedPrompt({
      prompt,
      images,
      audioTranscription,
      webSearchResults,
    });

    if (model.startsWith("gpt-") || model.includes("openai")) {
      yield* callOpenAIStream(model, enhancedPrompt, images);
    } else if (model.includes("claude")) {
      yield* callAnthropicStream(model, enhancedPrompt, images);
    } else if (model.startsWith("grok-") || model.includes("xai")) {
      yield* callXAIStream(model, enhancedPrompt, images);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error) {
    console.error("LLM stream call failed:", error);
    yield {
      content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      isComplete: true,
    };
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

  const completion = await openai.chat.completions.create({
    model: model.replace("openai-", ""),
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
  images?: Array<{ url: string; description?: string }>
): AsyncGenerator<{ content: string; isComplete?: boolean; tokenUsage?: any }> {
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

async function* callAnthropicStream(
  model: string,
  prompt: string,
  images?: Array<{ url: string; description?: string }>
): AsyncGenerator<{ content: string; isComplete?: boolean; tokenUsage?: any }> {
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

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
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
  images?: Array<{ url: string; description?: string }>
): AsyncGenerator<{ content: string; isComplete?: boolean; tokenUsage?: any }> {
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

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
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
