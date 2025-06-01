import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Helper function to get or create user from Clerk auth
async function getOrCreateUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Check if user already exists
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (!user) {
    // Create new user
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? "",
      name: identity.name ?? "",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });

    user = await ctx.db.get(userId);
  } else {
    // Update last seen
    await ctx.db.patch(user._id, {
      lastSeen: Date.now(),
    });
  }

  return user;
}

// Create a new chat session
export const createSession = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to create or get user");

    const sessionId = await ctx.db.insert("chatSessions", {
      userId: user._id,
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

// Add an agent step to a session
export const addAgentStep = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    index: v.number(),
    model: v.string(),
    prompt: v.string(),
    name: v.optional(v.string()),
    connectionType: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("conditional"),
        v.literal("parallel"),
        v.literal("collaborative")
      )
    ),
    connectionCondition: v.optional(v.string()),
    sourceAgentIndex: v.optional(v.number()),
    executionGroup: v.optional(v.number()),
    dependsOn: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    const stepId = await ctx.db.insert("agentSteps", {
      sessionId: args.sessionId,
      userId: user._id,
      index: args.index,
      model: args.model,
      prompt: args.prompt,
      name: args.name,
      timestamp: Date.now(),
      isComplete: false,
      isStreaming: true,
      connectionType: args.connectionType,
      connectionCondition: args.connectionCondition,
      sourceAgentIndex: args.sourceAgentIndex,
      executionGroup: args.executionGroup,
      dependsOn: args.dependsOn,
      executionStartTime: Date.now(),
    });

    // Update session timestamp
    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
    });

    return stepId;
  },
});

// Update agent step with response
export const updateAgentStep = mutation({
  args: {
    stepId: v.id("agentSteps"),
    response: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    isComplete: v.boolean(),
    isStreaming: v.optional(v.boolean()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
      })
    ),
    error: v.optional(v.string()),
    provider: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    tokensPerSecond: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    const updateData: any = {
      isComplete: args.isComplete,
      isStreaming: args.isStreaming,
    };

    if (args.response !== undefined) updateData.response = args.response;
    if (args.reasoning !== undefined) updateData.reasoning = args.reasoning;
    if (args.tokenUsage !== undefined) updateData.tokenUsage = args.tokenUsage;
    if (args.error !== undefined) updateData.error = args.error;
    if (args.provider !== undefined) updateData.provider = args.provider;
    if (args.estimatedCost !== undefined)
      updateData.estimatedCost = args.estimatedCost;
    if (args.tokensPerSecond !== undefined)
      updateData.tokensPerSecond = args.tokensPerSecond;

    if (args.isComplete) {
      updateData.executionEndTime = Date.now();
      if (step.executionStartTime) {
        updateData.executionDuration = Date.now() - step.executionStartTime;
      }
    }

    await ctx.db.patch(args.stepId, updateData);
  },
});

// Update streamed content for an agent step
export const updateStreamedContent = mutation({
  args: {
    stepId: v.id("agentSteps"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    await ctx.db.patch(args.stepId, {
      streamedContent: args.content,
    });
  },
});

// Mark agent as skipped
export const updateAgentSkipped = mutation({
  args: {
    stepId: v.id("agentSteps"),
    skipReason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    await ctx.db.patch(args.stepId, {
      wasSkipped: true,
      skipReason: args.skipReason,
      isComplete: true,
      isStreaming: false,
      executionEndTime: Date.now(),
    });
  },
});

// Generate upload URL for files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    return await ctx.storage.generateUploadUrl();
  },
});

// Create file attachment
export const createAttachment = mutation({
  args: {
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
    storageId: v.id("_storage"),
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        duration: v.optional(v.number()),
        transcription: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session if provided
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== user._id) {
        throw new Error("Session not found or access denied");
      }
    }

    // Verify user owns the agent step if provided
    if (args.agentStepId) {
      const step = await ctx.db.get(args.agentStepId);
      if (!step || step.userId !== user._id) {
        throw new Error("Agent step not found or access denied");
      }
    }

    const attachmentId = await ctx.db.insert("fileAttachments", {
      userId: user._id,
      sessionId: args.sessionId,
      agentStepId: args.agentStepId,
      type: args.type,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      storageId: args.storageId,
      uploadedAt: Date.now(),
      metadata: args.metadata,
    });

    return attachmentId;
  },
});

// Delete a chat session and all related data
export const deleteSession = mutation({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    // Delete all agent steps
    const agentSteps = await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const step of agentSteps) {
      await ctx.db.delete(step._id);
    }

    // Delete all file attachments
    const attachments = await ctx.db
      .query("fileAttachments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const attachment of attachments) {
      // Delete from storage
      await ctx.storage.delete(attachment.storageId);
      // Delete attachment record
      await ctx.db.delete(attachment._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    timezone: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    const updateData: any = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.email !== undefined) updateData.email = args.email;
    if (args.bio !== undefined) updateData.bio = args.bio;
    if (args.company !== undefined) updateData.company = args.company;
    if (args.location !== undefined) updateData.location = args.location;
    if (args.website !== undefined) updateData.website = args.website;
    if (args.timezone !== undefined) updateData.timezone = args.timezone;
    if (args.profileImageUrl !== undefined)
      updateData.profileImageUrl = args.profileImageUrl;

    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(user._id, updateData);
    }
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    theme: v.optional(
      v.union(v.literal("dark"), v.literal("light"), v.literal("system"))
    ),
    language: v.optional(v.string()),
    timezone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),
    defaultModel: v.optional(v.string()),
    maxTokensPerRequest: v.optional(v.number()),
    temperature: v.optional(v.number()),
    autoSaveChats: v.optional(v.boolean()),
    dataRetention: v.optional(v.number()),
    shareUsageData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const updateData: any = {
      updatedAt: Date.now(),
    };

    // Add all provided fields to update data
    Object.keys(args).forEach((key) => {
      if (args[key as keyof typeof args] !== undefined) {
        updateData[key] = args[key as keyof typeof args];
      }
    });

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        ...updateData,
      });
    }
  },
});

// Update user billing information
export const updateUserBilling = mutation({
  args: {
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
    monthlyTokenUsage: v.optional(v.number()),
    monthlyTokenLimit: v.optional(v.number()),
    monthlySpend: v.optional(v.number()),
    hasPaymentMethod: v.optional(v.boolean()),
    lastPaymentDate: v.optional(v.number()),
    nextBillingDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    const existing = await ctx.db
      .query("userBilling")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const updateData: any = {
      updatedAt: Date.now(),
    };

    // Add all provided fields to update data
    Object.keys(args).forEach((key) => {
      if (args[key as keyof typeof args] !== undefined) {
        updateData[key] = args[key as keyof typeof args];
      }
    });

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("userBilling", {
        userId: user._id,
        createdAt: Date.now(),
        ...updateData,
      });
    }
  },
});

// Delete user account (soft delete - mark as deleted)
export const deleteUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // In a real app, you might want to soft delete or anonymize data
    // For now, we'll just mark the user as deleted
    await ctx.db.patch(user._id, {
      email: `deleted_${Date.now()}@deleted.com`,
      name: "Deleted User",
      lastSeen: Date.now(),
    });

    // You could also delete related data here
    // But be careful about data retention requirements
  },
});

// Update chat session title
export const updateSessionTitle = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Complete agent execution with performance metrics
export const completeAgentExecution = mutation({
  args: {
    stepId: v.id("agentSteps"),
    response: v.string(),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
      })
    ),
    estimatedCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    const now = Date.now();
    const executionDuration = step.executionStartTime
      ? now - step.executionStartTime
      : undefined;

    // Calculate tokens per second if we have duration and token usage
    let tokensPerSecond: number | undefined = undefined;
    if (executionDuration && args.tokenUsage && executionDuration > 0) {
      tokensPerSecond =
        (args.tokenUsage.totalTokens / executionDuration) * 1000; // Convert to per second
    }

    await ctx.db.patch(args.stepId, {
      response: args.response,
      tokenUsage: args.tokenUsage,
      estimatedCost: args.estimatedCost,
      tokensPerSecond,
      executionEndTime: now,
      executionDuration,
      isComplete: true,
      isStreaming: false,
    });
  },
});

// Start agent execution (used by stream-agent route)
export const startAgentExecution = mutation({
  args: {
    stepId: v.id("agentSteps"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    await ctx.db.patch(args.stepId, {
      executionStartTime: Date.now(),
      isStreaming: true,
      isComplete: false,
    });
  },
});

// Update agent with error (used by stream-agent route)
export const updateAgentError = mutation({
  args: {
    stepId: v.id("agentSteps"),
    error: v.string(),
    isComplete: v.boolean(),
    isStreaming: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    await ctx.db.patch(args.stepId, {
      error: args.error,
      isComplete: args.isComplete,
      isStreaming: args.isStreaming,
      executionEndTime: Date.now(),
    });
  },
});

// Add supervisor turn
export const addSupervisorTurn = mutation({
  args: {
    sessionId: v.id("chatSessions"),
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
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    return await ctx.db.insert("supervisorTurns", {
      sessionId: args.sessionId,
      userId: user._id,
      userInput: args.userInput,
      supervisorResponse: args.supervisorResponse,
      parsedMentions: args.parsedMentions,
      executedStepIds: args.executedStepIds,
      timestamp: Date.now(),
      isComplete: true,
      isStreaming: false,
    });
  },
});

// Start supervisor turn (for streaming)
export const startSupervisorTurn = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userInput: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    return await ctx.db.insert("supervisorTurns", {
      sessionId: args.sessionId,
      userId: user._id,
      userInput: args.userInput,
      supervisorResponse: "",
      timestamp: Date.now(),
      isComplete: false,
      isStreaming: true,
    });
  },
});

// Update supervisor turn with streaming content
export const updateSupervisorTurn = mutation({
  args: {
    turnId: v.id("supervisorTurns"),
    supervisorResponse: v.optional(v.string()),
    streamedContent: v.optional(v.string()),
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
    isComplete: v.optional(v.boolean()),
    isStreaming: v.optional(v.boolean()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the supervisor turn
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.userId !== user._id) {
      throw new Error("Supervisor turn not found or access denied");
    }

    const updateData: any = {};
    if (args.supervisorResponse !== undefined)
      updateData.supervisorResponse = args.supervisorResponse;
    if (args.streamedContent !== undefined)
      updateData.streamedContent = args.streamedContent;
    if (args.parsedMentions !== undefined)
      updateData.parsedMentions = args.parsedMentions;
    if (args.executedStepIds !== undefined)
      updateData.executedStepIds = args.executedStepIds;
    if (args.isComplete !== undefined) updateData.isComplete = args.isComplete;
    if (args.isStreaming !== undefined)
      updateData.isStreaming = args.isStreaming;
    if (args.error !== undefined) updateData.error = args.error;

    await ctx.db.patch(args.turnId, updateData);
  },
});

// Append to agent conversation history
export const appendAgentConversation = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    agentIndex: v.number(),
    userPrompt: v.string(),
    agentResponse: v.string(),
    triggeredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    const existing = await ctx.db
      .query("agentConversations")
      .withIndex("by_session_agent", (q) =>
        q.eq("sessionId", args.sessionId).eq("agentIndex", args.agentIndex)
      )
      .first();

    const newEntry = {
      userPrompt: args.userPrompt,
      agentResponse: args.agentResponse,
      timestamp: Date.now(),
      triggeredBy: args.triggeredBy || "supervisor",
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        conversationHistory: [...existing.conversationHistory, newEntry],
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("agentConversations", {
        sessionId: args.sessionId,
        userId: user._id,
        agentIndex: args.agentIndex,
        conversationHistory: [newEntry],
        lastUpdated: Date.now(),
      });
    }
  },
});
