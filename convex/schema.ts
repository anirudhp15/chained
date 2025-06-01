import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table to store Clerk user data
  users: defineTable({
    tokenIdentifier: v.string(), // Clerk's unique identifier
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // Chat sessions associated with users
  chatSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  // Agent steps within chat sessions
  agentSteps: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.id("users"), // Direct user association for easier querying
    index: v.number(), // Step order within the session
    model: v.string(),
    prompt: v.string(),
    name: v.optional(v.string()), // Custom name for the step
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

    // Performance tracking fields
    executionStartTime: v.optional(v.number()),
    executionEndTime: v.optional(v.number()),
    executionDuration: v.optional(v.number()), // milliseconds
    tokensPerSecond: v.optional(v.number()),
    estimatedCost: v.optional(v.number()), // in USD

    // Chain execution fields
    connectionType: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("conditional"),
        v.literal("parallel"),
        v.literal("collaborative"),
        v.literal("supervisor")
      )
    ),
    connectionCondition: v.optional(v.string()), // For conditional logic
    sourceAgentIndex: v.optional(v.number()), // Which agent this connects from
    executionGroup: v.optional(v.number()), // For parallel execution grouping
    dependsOn: v.optional(v.array(v.number())), // Array of agent indices this depends on
    wasSkipped: v.optional(v.boolean()), // If conditional agent was skipped
    skipReason: v.optional(v.string()), // Why agent was skipped

    // Multimodal fields
    attachmentIds: v.optional(v.array(v.id("fileAttachments"))), // References to uploaded files
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
  })
    .index("by_session", ["sessionId", "index"])
    .index("by_user", ["userId"])
    .index("by_user_session", ["userId", "sessionId"]),

  // Supervisor conversation turns
  supervisorTurns: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.id("users"), // Direct user association for easier querying
    userInput: v.string(),
    supervisorResponse: v.string(),
    parsedMentions: v.optional(
      v.array(
        v.object({
          agentIndex: v.number(),
          agentName: v.string(),
          taskPrompt: v.string(),
        })
      )
    ),
    executedStepIds: v.optional(v.array(v.id("agentSteps"))),
    timestamp: v.number(),
    isComplete: v.boolean(),
    isStreaming: v.optional(v.boolean()),
    error: v.optional(v.string()),
    streamedContent: v.optional(v.string()), // For partial streaming content
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_user_session", ["userId", "sessionId"]),

  // Agent conversation history (separate from visible agent steps)
  agentConversations: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.id("users"),
    agentIndex: v.number(),
    conversationHistory: v.array(
      v.object({
        userPrompt: v.string(), // User-facing task description
        agentResponse: v.string(), // Agent's response
        timestamp: v.number(),
        triggeredBy: v.optional(v.string()), // "user" | "supervisor"
      })
    ),
    lastUpdated: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_session_agent", ["sessionId", "agentIndex"])
    .index("by_user_session", ["userId", "sessionId"]),

  // File attachments associated with users and sessions
  fileAttachments: defineTable({
    userId: v.id("users"), // Direct user association
    sessionId: v.optional(v.id("chatSessions")),
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
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_agent_step", ["agentStepId"])
    .index("by_user_session", ["userId", "sessionId"]),
});
