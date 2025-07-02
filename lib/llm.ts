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
  customContext,
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
  customContext?: string;
}): Promise<LLMResponse> {
  try {
    // Build enhanced prompt with multimodal context
    const enhancedPrompt = buildEnhancedPrompt({
      prompt,
      images,
      audioTranscription,
      webSearchResults,
      model,
      customContext,
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
  customContext,
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
  customContext?: string;
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
      model,
      customContext,
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
    customContext?: string;
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

  // Add comprehensive LaTeX formatting instructions for mathematical content
  const latexInstructions = `

**IMPORTANT - Mathematical Formatting Instructions:**
When your response contains mathematical expressions, equations, formulas, or calculations, you MUST format them using proper LaTeX syntax:

• **Inline math**: Use single dollar signs: $x = 5$ or $E = mc^2$
• **Display equations**: Use double dollar signs: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
• **Multi-line equations**: Use double dollar signs with line breaks:
$$
\\begin{align}
x &= 5 \\\\
y &= 3x + 2 \\\\
y &= 17
\\end{align}
$$

**LaTeX Syntax Examples:**
- Fractions: $\\frac{numerator}{denominator}$
- Superscripts: $x^2$, $e^{-x}$  
- Subscripts: $x_1$, $a_{n+1}$
- Square roots: $\\sqrt{x}$, $\\sqrt[3]{x}$
- Greek letters: $\\alpha$, $\\beta$, $\\pi$, $\\theta$
- Summation: $\\sum_{i=1}^{n} x_i$
- Integration: $\\int_0^\\infty e^{-x} dx$
- Modular arithmetic: $a \\equiv b \\pmod{n}$
- Matrices: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$

**Critical Rules:**
1. Always use proper LaTeX delimiters ($...$ or $$...$$)
2. Escape backslashes properly: \\frac, \\sqrt, \\sum, etc.
3. Use \\pmod{n} for modular arithmetic, not "mod n"
4. For long derivations, use numbered equations or align environments
5. Never leave mathematical expressions as plain text when LaTeX formatting is appropriate

This ensures your mathematical content renders beautifully in the user interface.`;

  // Handle custom context vs model personality
  if (input.customContext && input.customContext.trim()) {
    // Custom context mode: Use custom context as system prompt + LaTeX instructions
    return `${input.customContext}${latexInstructions}\n\n${enhancedPrompt}`;
  } else {
    // Native mode: Add LaTeX instructions to ensure proper math formatting
    return `${latexInstructions}\n\n${enhancedPrompt}`;
  }
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
