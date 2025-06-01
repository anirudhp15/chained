import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function streamLLM({
  model,
  prompt,
  onChunk,
  onComplete,
  onError,
}: {
  model: string;
  prompt: string;
  onChunk: (chunk: string) => Promise<void>;
  onComplete: (usage?: TokenUsage) => Promise<void>;
  onError: (error: Error) => Promise<void>;
}): Promise<void> {
  try {
    if (model.startsWith("gpt-") || model.includes("openai")) {
      await streamOpenAI({ model, prompt, onChunk, onComplete, onError });
    } else if (model.includes("claude")) {
      await streamAnthropic({ model, prompt, onChunk, onComplete, onError });
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error) {
    await onError(error instanceof Error ? error : new Error("Unknown error"));
  }
}

async function streamOpenAI({
  model,
  prompt,
  onChunk,
  onComplete,
  onError,
}: {
  model: string;
  prompt: string;
  onChunk: (chunk: string) => Promise<void>;
  onComplete: (usage?: TokenUsage) => Promise<void>;
  onError: (error: Error) => Promise<void>;
}) {
  try {
    const stream = await openai.chat.completions.create({
      model: model.replace("openai-", ""),
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 4000,
      stream_options: { include_usage: true },
    });

    let usage: TokenUsage | undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        const content = delta.content;
        await onChunk(content);
      }

      // Handle usage information
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    await onComplete(usage);
  } catch (error) {
    await onError(
      error instanceof Error ? error : new Error("OpenAI streaming failed")
    );
  }
}

async function streamAnthropic({
  model,
  prompt,
  onChunk,
  onComplete,
  onError,
}: {
  model: string;
  prompt: string;
  onChunk: (chunk: string) => Promise<void>;
  onComplete: (usage?: TokenUsage) => Promise<void>;
  onError: (error: Error) => Promise<void>;
}) {
  try {
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let usage: TokenUsage | undefined;

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const content = chunk.delta.text;
        await onChunk(content);
      }

      if (chunk.type === "message_delta" && chunk.usage) {
        usage = {
          promptTokens: chunk.usage.input_tokens || 0,
          completionTokens: chunk.usage.output_tokens || 0,
          totalTokens:
            (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0),
        };
      }
    }

    await onComplete(usage);
  } catch (error) {
    await onError(
      error instanceof Error ? error : new Error("Anthropic streaming failed")
    );
  }
}
