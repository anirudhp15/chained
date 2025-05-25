import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatSessions: defineTable({
    title: v.string(),
    createdAt: v.number(),
  }),

  agentSteps: defineTable({
    sessionId: v.id("chatSessions"),
    index: v.number(), // 0, 1, or 2
    model: v.string(),
    prompt: v.string(),
    response: v.optional(v.string()),
    reasoning: v.optional(v.string()), // For models that support reasoning
    timestamp: v.number(),
    isComplete: v.boolean(),
    isStreaming: v.optional(v.boolean()),
    provider: v.optional(v.string()), // "openai" or "anthropic"
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
      })
    ),
    error: v.optional(v.string()),
    streamedContent: v.optional(v.string()), // For partial streaming content

    // NEW: Chain execution fields
    connectionType: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("conditional"),
        v.literal("parallel")
      )
    ),
    connectionCondition: v.optional(v.string()), // For conditional logic
    sourceAgentIndex: v.optional(v.number()), // Which agent this connects from
    executionGroup: v.optional(v.number()), // For parallel execution grouping
    dependsOn: v.optional(v.array(v.number())), // Array of agent indices this depends on
    wasSkipped: v.optional(v.boolean()), // If conditional agent was skipped
    skipReason: v.optional(v.string()), // Why agent was skipped
  }).index("by_session", ["sessionId", "index"]),
});
