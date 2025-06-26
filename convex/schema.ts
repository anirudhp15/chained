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
    // Profile fields
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    timezone: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),

    // Subscription fields
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trial"),
        v.literal("canceled"),
        v.literal("past_due")
      )
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
    trialEndDate: v.optional(v.number()),

    // Usage tracking fields
    dailyChainsUsed: v.optional(v.number()),
    monthlyChainsUsed: v.optional(v.number()),
    monthlyTokensUsed: v.optional(v.number()),
    lastUsageResetDate: v.optional(v.number()),
    totalChainsCreated: v.optional(v.number()),
    totalTokensUsed: v.optional(v.number()),

    // Feature access flags
    maxChainsPerDay: v.optional(v.number()),
    maxAgentsPerChain: v.optional(v.number()),
    canUseAdvancedModels: v.optional(v.boolean()),
    canSavePresets: v.optional(v.boolean()),
    maxCustomPresets: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_subscription_status", ["subscriptionStatus"]),

  // User preferences
  userPreferences: defineTable({
    userId: v.id("users"),
    // UI Preferences
    theme: v.optional(
      v.union(v.literal("dark"), v.literal("light"), v.literal("system"))
    ),
    language: v.optional(v.string()),
    timezone: v.optional(v.string()),

    // Notification Preferences
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),

    // AI Preferences
    defaultModel: v.optional(v.string()),
    maxTokensPerRequest: v.optional(v.number()),
    temperature: v.optional(v.number()),
    autoSaveChats: v.optional(v.boolean()),

    // Privacy Preferences
    dataRetention: v.optional(v.number()), // days
    shareUsageData: v.optional(v.boolean()),

    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Subscription plans configuration
  subscriptionPlans: defineTable({
    planId: v.string(), // "free", "pro"
    displayName: v.string(),
    description: v.string(),
    monthlyPrice: v.number(), // in cents
    yearlyPrice: v.number(), // in cents
    features: v.object({
      maxChainsPerDay: v.number(),
      maxAgentsPerChain: v.number(),
      maxCustomPresets: v.number(),
      canUseAdvancedModels: v.boolean(),
      canUseParallelExecution: v.boolean(),
      canExportConversations: v.boolean(),
      prioritySupport: v.boolean(),
      apiAccess: v.boolean(),
    }),
    stripePriceIdMonthly: v.optional(v.string()),
    stripePriceIdYearly: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plan_id", ["planId"])
    .index("by_active", ["isActive"]),

  // Enhanced billing information with more comprehensive tracking
  userBilling: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("unpaid"),
        v.literal("trialing")
      )
    ),
    subscriptionPlan: v.optional(v.string()),
    subscriptionPeriodStart: v.optional(v.number()),
    subscriptionPeriodEnd: v.optional(v.number()),

    // Usage tracking
    monthlyTokenUsage: v.optional(v.number()),
    monthlyTokenLimit: v.optional(v.number()),
    monthlySpend: v.optional(v.number()),

    // Payment method
    hasPaymentMethod: v.optional(v.boolean()),
    lastPaymentDate: v.optional(v.number()),
    nextBillingDate: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // Detailed usage tracking history
  usageHistory: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("chatSessions")),
    eventType: v.union(
      v.literal("chain_created"),
      v.literal("agent_executed"),
      v.literal("tokens_consumed"),
      v.literal("file_uploaded"),
      v.literal("subscription_changed")
    ),
    metadata: v.object({
      tokensUsed: v.optional(v.number()),
      agentCount: v.optional(v.number()),
      modelUsed: v.optional(v.string()),
      executionDuration: v.optional(v.number()),
      cost: v.optional(v.number()),
    }),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "timestamp"])
    .index("by_event_type", ["eventType"]),

  // Chat sessions associated with users
  chatSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
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
    thinking: v.optional(v.string()), // For streaming thinking process
    isThinking: v.optional(v.boolean()), // Whether currently thinking
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
    // Store copy references separately from user input
    references: v.optional(
      v.array(
        v.object({
          id: v.string(),
          sourceType: v.union(
            v.literal("user-prompt"),
            v.literal("agent-response"),
            v.literal("code-block"),
            v.literal("supervisor-response")
          ),
          agentIndex: v.optional(v.number()),
          agentName: v.optional(v.string()),
          agentModel: v.optional(v.string()),
          content: v.string(),
          truncatedPreview: v.string(),
          timestamp: v.number(),
          sessionId: v.optional(v.string()),
        })
      )
    ),
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

  // Access codes for closed beta
  accessCodes: defineTable({
    code: v.string(), // The access code (e.g., "BETA2024")
    isActive: v.boolean(),
    usageLimit: v.optional(v.number()), // Max number of uses (null = unlimited)
    timesUsed: v.number(),
    expiresAt: v.optional(v.number()), // Expiration timestamp (null = never expires)
    createdBy: v.optional(v.string()), // Who created this code
    description: v.optional(v.string()), // Internal description
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"])
    .index("by_expiration", ["expiresAt"]),

  // Track access code usage
  accessCodeUsage: defineTable({
    accessCodeId: v.id("accessCodes"),
    code: v.string(), // Denormalized for easier querying
    email: v.string(),
    clerkUserId: v.optional(v.string()), // Clerk user ID if they signed up
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    source: v.optional(v.string()), // Where they came from (referrer, utm, etc.)
    usedAt: v.number(),
  })
    .index("by_access_code", ["accessCodeId"])
    .index("by_code", ["code"])
    .index("by_email", ["email"])
    .index("by_clerk_user", ["clerkUserId"]),

  // Waitlist for users without access codes
  waitlist: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()), // Optional message from user
    status: v.union(
      v.literal("pending"),
      v.literal("invited"),
      v.literal("signed_up"),
      v.literal("rejected")
    ),
    source: v.optional(v.string()), // Landing page, referral, etc.
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    priority: v.optional(v.number()), // For manual prioritization
    invitedAt: v.optional(v.number()),
    signedUpAt: v.optional(v.number()),
    clerkUserId: v.optional(v.string()), // Set when they eventually sign up
    notes: v.optional(v.string()), // Internal notes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_priority", ["priority"])
    .index("by_clerk_user", ["clerkUserId"]),
});
