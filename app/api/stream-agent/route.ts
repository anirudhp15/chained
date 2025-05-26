import { type NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

export async function POST(request: NextRequest) {
  try {
    const {
      stepId,
      model,
      prompt,
      images,
      audioTranscription,
      webSearchResults,
    } = await request.json();

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Mark as streaming
          await convex.mutation(api.mutations.updateAgentStreaming, {
            stepId: stepId as Id<"agentSteps">,
            isStreaming: true,
          });

          // Build enhanced prompt with multimodal context
          const enhancedPrompt = buildEnhancedPrompt({
            prompt,
            images,
            audioTranscription,
            webSearchResults,
          });

          const fullResponse = "";
          const tokenUsage: TokenUsage | null = null;

          // Stream the response based on model provider
          if (model.startsWith("gpt-") || model.includes("openai")) {
            await streamOpenAI(
              model,
              enhancedPrompt,
              images,
              controller,
              stepId as Id<"agentSteps">,
              fullResponse,
              tokenUsage
            );
          } else if (model.includes("claude")) {
            await streamAnthropic(
              model,
              enhancedPrompt,
              images,
              controller,
              stepId as Id<"agentSteps">,
              fullResponse,
              tokenUsage
            );
          } else if (model.startsWith("grok-") || model.includes("xai")) {
            await streamXAI(
              model,
              enhancedPrompt,
              images,
              controller,
              stepId as Id<"agentSteps">,
              fullResponse,
              tokenUsage
            );
          } else {
            throw new Error(`Unsupported model: ${model}`);
          }
        } catch (error) {
          console.error("Streaming failed:", error);

          await convex.mutation(api.mutations.updateAgentError, {
            stepId: stepId as Id<"agentSteps">,
            error:
              error instanceof Error
                ? error.message
                : "Unknown streaming error",
            isComplete: true,
            isStreaming: false,
          });

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown streaming error",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream setup failed:", error);
    return new Response(JSON.stringify({ error: "Failed to setup stream" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildEnhancedPrompt(input: {
  prompt: string;
  images?: Array<{ url: string; description?: string }>;
  audioTranscription?: string;
  webSearchResults?: Array<{
    title: string;
    snippet: string;
    url: string;
    source?: string;
  }>;
}): string {
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

async function streamOpenAI(
  model: string,
  prompt: string,
  images: Array<{ url: string; description?: string }> | undefined,
  controller: ReadableStreamDefaultController,
  stepId: Id<"agentSteps">,
  fullResponse: string,
  tokenUsage: TokenUsage | null
) {
  try {
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

    const stream = await openai.chat.completions.create({
      model: model.replace("openai-", ""),
      messages,
      stream: true,
      max_tokens: 4000,
    });

    let chunkCount = 0;
    const updateFrequency = 5; // Update database every 5 chunks for better performance

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        const content = delta.content;
        fullResponse += content;
        chunkCount++;

        // Send chunk to client immediately for fast streaming
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "chunk",
              content: content,
              fullContent: fullResponse,
            })}\n\n`
          )
        );

        // Update database less frequently to improve performance
        if (chunkCount % updateFrequency === 0) {
          await convex.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: fullResponse,
          });
        }
      }

      // Handle usage information
      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    // Final update to database
    await convex.mutation(api.mutations.updateAgentResponse, {
      stepId,
      response: fullResponse,
      tokenUsage: tokenUsage || undefined,
      isComplete: true,
      isStreaming: false,
    });

    // Send completion signal
    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify({
          type: "complete",
          response: fullResponse,
          tokenUsage: tokenUsage || undefined,
        })}\n\n`
      )
    );

    controller.close();
  } catch (error) {
    throw new Error(
      `OpenAI streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function streamAnthropic(
  model: string,
  prompt: string,
  images: Array<{ url: string; description?: string }> | undefined,
  controller: ReadableStreamDefaultController,
  stepId: Id<"agentSteps">,
  fullResponse: string,
  tokenUsage: TokenUsage | null
) {
  try {
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

    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{ role: "user", content }],
      stream: true,
    });

    let chunkCount = 0;
    const updateFrequency = 5; // Update database every 5 chunks for better performance

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const content = chunk.delta.text;
        fullResponse += content;
        chunkCount++;

        // Send chunk to client immediately for fast streaming
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "chunk",
              content: content,
              fullContent: fullResponse,
            })}\n\n`
          )
        );

        // Update database less frequently to improve performance
        if (chunkCount % updateFrequency === 0) {
          await convex.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: fullResponse,
          });
        }
      }

      // Handle usage information
      if (chunk.type === "message_delta" && chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.input_tokens || 0,
          completionTokens: chunk.usage.output_tokens || 0,
          totalTokens:
            (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0),
        };
      }
    }

    // Final update to database
    await convex.mutation(api.mutations.updateAgentResponse, {
      stepId,
      response: fullResponse,
      tokenUsage: tokenUsage || undefined,
      isComplete: true,
      isStreaming: false,
    });

    // Send completion signal
    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify({
          type: "complete",
          response: fullResponse,
          tokenUsage: tokenUsage || undefined,
        })}\n\n`
      )
    );

    controller.close();
  } catch (error) {
    throw new Error(
      `Anthropic streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function streamXAI(
  model: string,
  prompt: string,
  images: Array<{ url: string; description?: string }> | undefined,
  controller: ReadableStreamDefaultController,
  stepId: Id<"agentSteps">,
  fullResponse: string,
  tokenUsage: TokenUsage | null
) {
  try {
    // xAI client setup
    const xai = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });

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

    const stream = await xai.chat.completions.create({
      model: model,
      messages,
      stream: true,
      max_tokens: 4000,
    });

    let chunkCount = 0;
    const updateFrequency = 5; // Update database every 5 chunks for better performance

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        const content = delta.content;
        fullResponse += content;
        chunkCount++;

        // Send chunk to client immediately for fast streaming
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "chunk",
              content: content,
              fullContent: fullResponse,
            })}\n\n`
          )
        );

        // Update database less frequently to improve performance
        if (chunkCount % updateFrequency === 0) {
          await convex.mutation(api.mutations.updateStreamedContent, {
            stepId,
            content: fullResponse,
          });
        }
      }

      // Handle usage information
      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    // Final update to database
    await convex.mutation(api.mutations.updateAgentResponse, {
      stepId,
      response: fullResponse,
      tokenUsage: tokenUsage || undefined,
      isComplete: true,
      isStreaming: false,
    });

    // Send completion signal
    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify({
          type: "complete",
          response: fullResponse,
          tokenUsage: tokenUsage || undefined,
        })}\n\n`
      )
    );

    controller.close();
  } catch (error) {
    throw new Error(
      `xAI streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
