import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatSessions: defineTable({
    title: v.string(),
    createdAt: v.number(),
  }),

  // New table for storing attachment metadata
  attachments: defineTable({
    sessionId: v.id("chatSessions"),
    agentStepId: v.optional(v.id("agentSteps")),
    type: v.union(
      v.literal("image"),
      v.literal("audio"),
      v.literal("document")
    ),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageId: v.id("_storage"), // Convex file storage ID
    uploadedAt: v.number(),
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        duration: v.optional(v.number()), // for audio files
        transcription: v.optional(v.string()), // for audio files
      })
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_agent_step", ["agentStepId"]),

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

    // Chain execution fields
    connectionType: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("conditional"),
        v.literal("parallel"),
        v.literal("collaborative")
      )
    ),
    connectionCondition: v.optional(v.string()), // For conditional logic
    sourceAgentIndex: v.optional(v.number()), // Which agent this connects from
    executionGroup: v.optional(v.number()), // For parallel execution grouping
    dependsOn: v.optional(v.array(v.number())), // Array of agent indices this depends on
    wasSkipped: v.optional(v.boolean()), // If conditional agent was skipped
    skipReason: v.optional(v.string()), // Why agent was skipped

    // NEW: Multimodal fields
    attachmentIds: v.optional(v.array(v.id("attachments"))), // References to uploaded files
    webSearchResults: v.optional(
      v.array(
        v.object({
          query: v.string(),
          results: v.array(
            v.object({
              title: v.string(),
              url: v.string(),
              snippet: v.string(),
              publishedDate: v.optional(v.string()),
              source: v.optional(v.string()),
            })
          ),
          searchedAt: v.number(),
        })
      )
    ),
    audioTranscription: v.optional(
      v.object({
        originalText: v.string(), // The transcribed text
        confidence: v.optional(v.number()),
        language: v.optional(v.string()),
        duration: v.optional(v.number()),
      })
    ),
  }).index("by_session", ["sessionId", "index"]),
});
