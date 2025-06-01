import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export interface ThinkingPhase {
  id: string;
  content: string;
  duration: number;
  timestamp: number;
}

export interface ThinkingState {
  phases: ThinkingPhase[];
  currentPhase: number;
  isActive: boolean;
  fullContent: string;
  startTime: number;
  provider: "openai" | "anthropic" | "xai";
  modelType: "reasoning" | "standard";
}

export interface ThinkingChunk {
  type: "thinking" | "content" | "complete";
  content?: string;
  thinking?: string;
  isThinking?: boolean;
  phase?: ThinkingPhase;
  usage?: any;
}

export interface ThinkingManagerOptions {
  stepId: Id<"agentSteps">;
  convexClient: ConvexHttpClient;
  provider: "openai" | "anthropic" | "xai";
  model: string;
  batchInterval?: number; // milliseconds between database updates
  maxBatchSize?: number; // max items before forced batch update
}

export class ThinkingManager {
  private stepId: Id<"agentSteps">;
  private convex: ConvexHttpClient;
  private provider: "openai" | "anthropic" | "xai";
  private model: string;
  private modelType: "reasoning" | "standard";

  // Batching configuration
  private batchInterval: number;
  private maxBatchSize: number;
  private batchTimer: NodeJS.Timeout | null = null;
  private pendingUpdates: Array<{
    type: string;
    data: any;
    timestamp: number;
  }> = [];

  // Thinking state
  private state: ThinkingState;
  private thinkingPhases: ThinkingPhase[] = [];

  constructor(options: ThinkingManagerOptions) {
    this.stepId = options.stepId;
    this.convex = options.convexClient;
    this.provider = options.provider;
    this.model = options.model;
    this.batchInterval = options.batchInterval || 2000; // 2 seconds
    this.maxBatchSize = options.maxBatchSize || 5;

    // Determine model type
    this.modelType = this.isReasoningModel(options.model)
      ? "reasoning"
      : "standard";

    // Initialize thinking state
    this.state = {
      phases: [],
      currentPhase: 0,
      isActive: false,
      fullContent: "",
      startTime: 0,
      provider: this.provider,
      modelType: this.modelType,
    };

    this.initializeThinkingPhases();
  }

  private isReasoningModel(model: string): boolean {
    return (
      model.includes("o1") ||
      model.includes("o3") ||
      model.includes("o4") ||
      model.includes("claude-3-opus") ||
      (model.includes("grok") && model.includes("thinking"))
    );
  }

  private initializeThinkingPhases(): void {
    const basePhases = [
      { content: "Analyzing the problem statement...", duration: 1500 },
      { content: "Breaking down the requirements...", duration: 1200 },
      { content: "Considering different approaches...", duration: 1800 },
      { content: "Evaluating potential solutions...", duration: 1400 },
      { content: "Working through the logic step by step...", duration: 2000 },
      { content: "Checking for edge cases and constraints...", duration: 1600 },
      { content: "Refining the approach...", duration: 1300 },
      { content: "Finalizing the solution strategy...", duration: 1100 },
    ];

    // Customize phases based on provider
    const providerPhases = this.getProviderSpecificPhases();
    const combinedPhases = [...basePhases, ...providerPhases];

    this.thinkingPhases = combinedPhases.map((phase, index) => ({
      id: `phase_${index}`,
      content: phase.content,
      duration: phase.duration,
      timestamp: 0,
    }));
  }

  private getProviderSpecificPhases(): Array<{
    content: string;
    duration: number;
  }> {
    switch (this.provider) {
      case "openai":
        return [
          { content: "Leveraging reasoning capabilities...", duration: 1400 },
          {
            content: "Cross-checking with OpenAI guidelines...",
            duration: 1200,
          },
        ];
      case "anthropic":
        return [
          {
            content: "Applying constitutional AI principles...",
            duration: 1600,
          },
          {
            content: "Ensuring helpful, harmless, and honest response...",
            duration: 1300,
          },
        ];
      case "xai":
        return [
          { content: "Accessing real-time information...", duration: 1500 },
          {
            content: "Integrating current context and data...",
            duration: 1400,
          },
        ];
      default:
        return [];
    }
  }

  public async startThinking(): Promise<void> {
    this.state.isActive = true;
    this.state.startTime = Date.now();
    this.state.currentPhase = 0;

    // Initial database update
    await this.queueUpdate("start_thinking", {
      isThinking: true,
      thinking: "Starting to analyze the problem...",
      isComplete: false,
    });
  }

  public async *generateThinkingStream(): AsyncGenerator<ThinkingChunk> {
    if (!this.state.isActive) {
      await this.startThinking();
    }

    // Simulate thinking process with phases
    while (
      this.state.currentPhase < this.thinkingPhases.length &&
      this.state.isActive
    ) {
      const phase = this.thinkingPhases[this.state.currentPhase];
      phase.timestamp = Date.now();

      // Update full content with new phase
      if (this.state.fullContent) {
        this.state.fullContent += "\n\n";
      }
      this.state.fullContent += phase.content;

      // Yield thinking update
      yield {
        type: "thinking",
        thinking: this.state.fullContent,
        isThinking: true,
        phase,
      };

      // Queue database update
      await this.queueUpdate("thinking_phase", {
        thinking: this.state.fullContent,
        isThinking: true,
      });

      // Wait for phase duration
      await new Promise((resolve) => setTimeout(resolve, phase.duration));

      this.state.currentPhase++;
    }

    // Complete thinking
    if (this.state.isActive) {
      this.state.fullContent += "\n\nNow generating response...";

      yield {
        type: "thinking",
        thinking: this.state.fullContent,
        isThinking: false,
      };

      await this.queueUpdate("thinking_complete", {
        thinking: this.state.fullContent,
        isThinking: false,
      });
    }
  }

  public async *simulateRealThinking(
    realThinkingContent?: string
  ): AsyncGenerator<ThinkingChunk> {
    if (!this.state.isActive) {
      await this.startThinking();
    }

    if (realThinkingContent) {
      // Stream real thinking content in chunks
      const chunks = this.chunkThinkingContent(realThinkingContent);

      for (const chunk of chunks) {
        this.state.fullContent = chunk;

        yield {
          type: "thinking",
          thinking: chunk,
          isThinking: true,
        };

        await this.queueUpdate("real_thinking", {
          thinking: chunk,
          isThinking: true,
        });

        // Small delay between chunks for streaming effect
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } else {
      // Fall back to simulated thinking
      yield* this.generateThinkingStream();
    }
  }

  private chunkThinkingContent(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const testChunk = currentChunk
        ? `${currentChunk}. ${sentence.trim()}`
        : sentence.trim();

      if (testChunk.length > 200 && currentChunk) {
        chunks.push(currentChunk + ".");
        currentChunk = sentence.trim();
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + (currentChunk.endsWith(".") ? "" : "."));
    }

    return chunks;
  }

  public async queueUpdate(type: string, data: any): Promise<void> {
    this.pendingUpdates.push({
      type,
      data: { ...data, stepId: this.stepId },
      timestamp: Date.now(),
    });

    // Force update if batch is full
    if (this.pendingUpdates.length >= this.maxBatchSize) {
      await this.flushUpdates();
    } else if (!this.batchTimer) {
      // Set timer for next batch update
      this.batchTimer = setTimeout(() => {
        this.flushUpdates();
      }, this.batchInterval);
    }
  }

  private async flushUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;

    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Get the most recent thinking content
      const latestThinkingUpdate = updates
        .filter((u) => u.data.thinking !== undefined)
        .pop();

      const latestStatusUpdate = updates
        .filter(
          (u) =>
            u.data.isThinking !== undefined || u.data.isComplete !== undefined
        )
        .pop();

      // Combine into single update
      const finalUpdate: any = { stepId: this.stepId };

      if (latestThinkingUpdate) {
        finalUpdate.thinking = latestThinkingUpdate.data.thinking;
      }

      if (latestStatusUpdate) {
        if (latestStatusUpdate.data.isThinking !== undefined) {
          finalUpdate.isThinking = latestStatusUpdate.data.isThinking;
        }
        if (latestStatusUpdate.data.isComplete !== undefined) {
          finalUpdate.isComplete = latestStatusUpdate.data.isComplete;
        }
      }

      // Single batched database update
      await this.convex.mutation(api.mutations.updateAgentStep, finalUpdate);
    } catch (error) {
      console.error("Batch update failed:", error);

      // Re-queue updates on failure with exponential backoff
      setTimeout(() => {
        this.pendingUpdates.unshift(...updates);
        this.flushUpdates();
      }, 1000);
    }
  }

  public async completeThinking(finalContent?: string): Promise<void> {
    this.state.isActive = false;

    if (finalContent) {
      this.state.fullContent = finalContent;
    }

    await this.queueUpdate("complete", {
      thinking: this.state.fullContent,
      isThinking: false,
      isComplete: true,
    });

    // Force final flush
    await this.flushUpdates();
  }

  public async updateStreamContent(content: string): Promise<void> {
    // Optimistic update - don't batch content updates for responsiveness
    try {
      await this.convex.mutation(api.mutations.updateStreamedContent, {
        stepId: this.stepId,
        content,
      });
    } catch (error) {
      console.error("Stream content update failed:", error);
    }
  }

  public getState(): ThinkingState {
    return { ...this.state };
  }

  public async cleanup(): Promise<void> {
    this.state.isActive = false;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Final flush of any pending updates
    await this.flushUpdates();
  }
}

// Factory function to create thinking manager
export function createThinkingManager(
  options: ThinkingManagerOptions
): ThinkingManager {
  return new ThinkingManager(options);
}

// Utility function to determine provider from model
export function getProviderFromModel(
  model: string
): "openai" | "anthropic" | "xai" {
  if (
    model.startsWith("gpt-") ||
    model.includes("openai") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4")
  ) {
    return "openai";
  }

  if (model.includes("claude")) {
    return "anthropic";
  }

  if (model.startsWith("grok-") || model.includes("xai")) {
    return "xai";
  }

  throw new Error(`Unsupported model: ${model}`);
}
