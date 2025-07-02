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

// Helper function to get user without updating lastSeen (for high-frequency operations)
async function getUserForStreaming(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Just get the user without updating lastSeen to avoid concurrency issues
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (!user) {
    throw new Error("User not found");
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

// Update agent step with response (optimized for streaming)
export const updateAgentStep = mutation({
  args: {
    stepId: v.id("agentSteps"),
    response: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    thinking: v.optional(v.string()),
    isThinking: v.optional(v.boolean()),
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
    firstTokenLatency: v.optional(v.number()),
    suppressResponseUpdate: v.optional(v.boolean()), // Flag to prevent response field updates in supervisor mode
  },
  handler: async (ctx, args) => {
    // Use optimized user lookup for streaming operations
    const user = await getUserForStreaming(ctx);

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    // SUPERVISOR MODE PROTECTION: Check if there's an active supervisor turn
    // This prevents dual rendering when supervisor is using conversation-isolated streaming
    if (!args.suppressResponseUpdate) {
      const activeSupervisorTurn = await ctx.db
        .query("supervisorTurns")
        .withIndex("by_session", (q) => q.eq("sessionId", step.sessionId))
        .filter((q) => q.eq(q.field("isStreaming"), true))
        .first();

      if (activeSupervisorTurn && args.response !== undefined) {
        console.log(
          `🚫 BLOCKING UPDATE AGENT STEP: Active supervisor turn detected for session ${step.sessionId}, agent ${step.index}`
        );
        console.log(
          `🚫 BLOCKING: Not updating response field during supervisor interaction`
        );
        // Don't return, but suppress response update
        args.suppressResponseUpdate = true;
      }
    }

    const updateData: any = {
      isComplete: args.isComplete,
      isStreaming: args.isStreaming,
    };

    // SUPERVISOR MODE FIX: Only update response field if not suppressed
    // This prevents dual rendering when conversation history is handling display
    if (args.response !== undefined && !args.suppressResponseUpdate) {
      updateData.response = args.response;
      console.log(
        `💾 UPDATE AGENT STEP: Setting response for step ${args.stepId} (${args.response.length} chars)`
      );
    } else if (args.suppressResponseUpdate) {
      console.log(
        `🚫 SUPPRESSED: Not updating response field for step ${args.stepId} (supervisor mode)`
      );
    }

    if (args.reasoning !== undefined) updateData.reasoning = args.reasoning;
    if (args.thinking !== undefined) updateData.thinking = args.thinking;
    if (args.isThinking !== undefined) updateData.isThinking = args.isThinking;
    if (args.tokenUsage !== undefined) updateData.tokenUsage = args.tokenUsage;
    if (args.error !== undefined) updateData.error = args.error;
    if (args.provider !== undefined) updateData.provider = args.provider;
    if (args.estimatedCost !== undefined)
      updateData.estimatedCost = args.estimatedCost;
    if (args.tokensPerSecond !== undefined)
      updateData.tokensPerSecond = args.tokensPerSecond;
    if (args.firstTokenLatency !== undefined)
      updateData.firstTokenLatency = args.firstTokenLatency;

    if (args.isComplete) {
      updateData.executionEndTime = Date.now();
      if (step.executionStartTime) {
        updateData.executionDuration = Date.now() - step.executionStartTime;
      }
    }

    await ctx.db.patch(args.stepId, updateData);
  },
});

// Update streamed content for an agent step (optimized for high frequency)
export const updateStreamedContent = mutation({
  args: {
    stepId: v.id("agentSteps"),
    content: v.string(),
    supervisorModeBypass: v.optional(v.boolean()), // Allow bypass for specific cases
  },
  handler: async (ctx, args) => {
    const user = await getUserForStreaming(ctx);

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    // SUPERVISOR MODE PROTECTION: Check if there's an active supervisor turn
    // This prevents dual rendering when supervisor is using conversation-isolated streaming
    if (!args.supervisorModeBypass) {
      const activeSupervisorTurn = await ctx.db
        .query("supervisorTurns")
        .withIndex("by_session", (q) => q.eq("sessionId", step.sessionId))
        .filter((q) => q.eq(q.field("isStreaming"), true))
        .first();

      if (activeSupervisorTurn) {
        console.log(
          `🚫 BLOCKING UPDATE STREAMED CONTENT: Active supervisor turn detected for session ${step.sessionId}, agent ${step.index}`
        );
        console.log(
          `🚫 BLOCKING: Supervisor turn ${activeSupervisorTurn._id} is streaming`
        );
        return; // Block the update to prevent dual rendering
      }
    }

    // DETAILED DEBUG: Log what's calling this during supervisor interactions
    console.log(
      `📝 UPDATE STREAMED CONTENT: Step ${args.stepId} content length: ${args.content.length}`
    );
    console.log(
      `📝 UPDATE STREAMED CONTENT: Agent index ${step.index}, session ${step.sessionId}`
    );
    console.log(
      `📝 UPDATE STREAMED CONTENT: Content preview: ${args.content.substring(0, 100)}...`
    );

    // Log stack trace to see what's calling this
    console.log(
      `📝 UPDATE STREAMED CONTENT: Called from:`,
      new Error().stack?.split("\n").slice(1, 4).join("\n")
    );

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

    // Delete all user data in proper order (respecting foreign key constraints)

    // 1. Delete all agent steps for user's sessions
    const userSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of userSessions) {
      const agentSteps = await ctx.db
        .query("agentSteps")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();

      for (const step of agentSteps) {
        await ctx.db.delete(step._id);
      }

      // Delete supervisor turns for this session
      const supervisorTurns = await ctx.db
        .query("supervisorTurns")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const turn of supervisorTurns) {
        await ctx.db.delete(turn._id);
      }
    }

    // 2. Delete all chat sessions
    for (const session of userSessions) {
      await ctx.db.delete(session._id);
    }

    // 3. Delete user preferences
    const userPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (userPrefs) {
      await ctx.db.delete(userPrefs._id);
    }

    // 4. Delete billing info
    const billingInfo = await ctx.db
      .query("userBilling")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (billingInfo) {
      await ctx.db.delete(billingInfo._id);
    }

    // 5. Delete usage history
    const usageHistory = await ctx.db
      .query("usageHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const record of usageHistory) {
      await ctx.db.delete(record._id);
    }

    // 6. Delete saved chains
    const savedChains = await ctx.db
      .query("savedChains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const chain of savedChains) {
      await ctx.db.delete(chain._id);
    }

    // 7. Finally delete the user
    await ctx.db.delete(user._id);

    return { success: true };
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

// Complete agent execution with performance metrics (optimized)
export const completeAgentExecution = mutation({
  args: {
    stepId: v.id("agentSteps"),
    response: v.string(),
    thinking: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
      })
    ),
    estimatedCost: v.optional(v.number()),
    firstTokenLatency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserForStreaming(ctx);

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
      thinking: args.thinking,
      tokenUsage: args.tokenUsage,
      estimatedCost: args.estimatedCost,
      tokensPerSecond,
      firstTokenLatency: args.firstTokenLatency,
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

// Update agent step name
export const updateAgentStepName = mutation({
  args: {
    stepId: v.id("agentSteps"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or access denied");
    }

    // Validate name
    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Agent name cannot be empty");
    }
    if (trimmedName.length > 50) {
      throw new Error("Agent name cannot exceed 50 characters");
    }

    await ctx.db.patch(args.stepId, {
      name: trimmedName,
    });

    return trimmedName;
  },
});

// Add supervisor turn
export const addSupervisorTurn = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userInput: v.string(),
    supervisorResponse: v.string(),
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
      references: args.references,
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
      references: args.references,
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
    if (args.references !== undefined) updateData.references = args.references;
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
      references: args.references || [],
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

// Validate access code for closed beta
export const validateAccessCode = mutation({
  args: {
    code: v.string(),
    email: v.string(),
    metadata: v.optional(
      v.object({
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        source: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { code, email, metadata = {} }) => {
    // Find the access code
    const accessCode = await ctx.db
      .query("accessCodes")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase().trim()))
      .unique();

    if (!accessCode) {
      return { valid: false, reason: "Invalid access code" };
    }

    if (!accessCode.isActive) {
      return { valid: false, reason: "Access code is no longer active" };
    }

    if (accessCode.expiresAt && Date.now() > accessCode.expiresAt) {
      return { valid: false, reason: "Access code has expired" };
    }

    if (
      accessCode.usageLimit &&
      accessCode.timesUsed >= accessCode.usageLimit
    ) {
      return { valid: false, reason: "Access code usage limit reached" };
    }

    // Check if this email already used a code
    const existingUsage = await ctx.db
      .query("accessCodeUsage")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingUsage) {
      return { valid: false, reason: "Email already used for beta access" };
    }

    // Record the usage
    await ctx.db.insert("accessCodeUsage", {
      accessCodeId: accessCode._id,
      code: accessCode.code,
      email,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      source: metadata.source,
      usedAt: Date.now(),
    });

    // Update usage count
    await ctx.db.patch(accessCode._id, {
      timesUsed: accessCode.timesUsed + 1,
      updatedAt: Date.now(),
    });

    return { valid: true, message: "Access code validated successfully" };
  },
});

// Join waitlist for closed beta
export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        source: v.optional(v.string()),
        utmSource: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        utmCampaign: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { email, name, message, metadata = {} }) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return {
        success: false,
        reason: "Email already on waitlist",
        position: null,
      };
    }

    // Add to waitlist
    await ctx.db.insert("waitlist", {
      email,
      name,
      message,
      status: "pending",
      source: metadata.source,
      utmSource: metadata.utmSource,
      utmMedium: metadata.utmMedium,
      utmCampaign: metadata.utmCampaign,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      referrer: metadata.referrer,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get position in waitlist
    const totalCount = await ctx.db
      .query("waitlist")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      success: true,
      message: "Successfully joined waitlist",
      position: totalCount.length,
    };
  },
});

// Saved Chains Mutations

// Create a new saved chain
export const createSavedChain = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    agents: v.array(
      v.object({
        id: v.string(),
        model: v.string(),
        prompt: v.string(),
        name: v.optional(v.string()),
        connection: v.optional(
          v.object({
            type: v.union(
              v.literal("direct"),
              v.literal("conditional"),
              v.literal("parallel"),
              v.literal("collaborative")
            ),
            condition: v.optional(v.string()),
            sourceAgentId: v.optional(v.string()),
          })
        ),
        images: v.optional(
          v.array(
            v.object({
              url: v.string(),
              filename: v.string(),
              size: v.number(),
              mimeType: v.string(),
            })
          )
        ),
        audioBlob: v.optional(v.any()),
        audioDuration: v.optional(v.number()),
        audioTranscription: v.optional(v.string()),
        webSearchData: v.optional(
          v.object({
            query: v.string(),
            results: v.array(
              v.object({
                title: v.string(),
                url: v.string(),
                snippet: v.string(),
              })
            ),
          })
        ),
        webSearchEnabled: v.optional(v.boolean()),
        grokOptions: v.optional(
          v.object({
            realTimeData: v.optional(v.boolean()),
            thinkingMode: v.optional(v.boolean()),
          })
        ),
        claudeOptions: v.optional(
          v.object({
            enableTools: v.optional(v.boolean()),
            toolSet: v.optional(
              v.union(
                v.literal("webSearch"),
                v.literal("fileAnalysis"),
                v.literal("computerUse"),
                v.literal("full")
              )
            ),
            fileAttachments: v.optional(
              v.array(
                v.object({
                  name: v.string(),
                  content: v.string(),
                  mimeType: v.string(),
                })
              )
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // TODO: Add paywall check here when implementing billing
    // For now, no limits

    const now = Date.now();
    const chainId = await ctx.db.insert("savedChains", {
      userId: user._id,
      name: args.name,
      description: args.description,
      agents: args.agents,
      createdAt: now,
      updatedAt: now,
    });

    return chainId;
  },
});

// Update an existing saved chain
export const updateSavedChain = mutation({
  args: {
    chainId: v.id("savedChains"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    agents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          model: v.string(),
          prompt: v.string(),
          name: v.optional(v.string()),
          connection: v.optional(
            v.object({
              type: v.union(
                v.literal("direct"),
                v.literal("conditional"),
                v.literal("parallel"),
                v.literal("collaborative")
              ),
              condition: v.optional(v.string()),
              sourceAgentId: v.optional(v.string()),
            })
          ),
          images: v.optional(
            v.array(
              v.object({
                url: v.string(),
                filename: v.string(),
                size: v.number(),
                mimeType: v.string(),
              })
            )
          ),
          audioBlob: v.optional(v.any()),
          audioDuration: v.optional(v.number()),
          audioTranscription: v.optional(v.string()),
          webSearchData: v.optional(
            v.object({
              query: v.string(),
              results: v.array(
                v.object({
                  title: v.string(),
                  url: v.string(),
                  snippet: v.string(),
                })
              ),
            })
          ),
          webSearchEnabled: v.optional(v.boolean()),
          grokOptions: v.optional(
            v.object({
              realTimeData: v.optional(v.boolean()),
              thinkingMode: v.optional(v.boolean()),
            })
          ),
          claudeOptions: v.optional(
            v.object({
              enableTools: v.optional(v.boolean()),
              toolSet: v.optional(
                v.union(
                  v.literal("webSearch"),
                  v.literal("fileAnalysis"),
                  v.literal("computerUse"),
                  v.literal("full")
                )
              ),
              fileAttachments: v.optional(
                v.array(
                  v.object({
                    name: v.string(),
                    content: v.string(),
                    mimeType: v.string(),
                  })
                )
              ),
            })
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the chain
    const chain = await ctx.db.get(args.chainId);
    if (!chain || chain.userId !== user._id) {
      throw new Error("Saved chain not found or access denied");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.agents !== undefined) updateData.agents = args.agents;

    await ctx.db.patch(args.chainId, updateData);
    return args.chainId;
  },
});

// Delete a saved chain
export const deleteSavedChain = mutation({
  args: {
    chainId: v.id("savedChains"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the chain
    const chain = await ctx.db.get(args.chainId);
    if (!chain || chain.userId !== user._id) {
      throw new Error("Saved chain not found or access denied");
    }

    await ctx.db.delete(args.chainId);
    return { success: true };
  },
});

// Duplicate a saved chain
export const duplicateSavedChain = mutation({
  args: {
    chainId: v.id("savedChains"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    if (!user) throw new Error("Failed to get user");

    // Verify user owns the original chain
    const originalChain = await ctx.db.get(args.chainId);
    if (!originalChain || originalChain.userId !== user._id) {
      throw new Error("Saved chain not found or access denied");
    }

    // TODO: Add paywall check here when implementing billing

    const now = Date.now();
    const duplicateId = await ctx.db.insert("savedChains", {
      userId: user._id,
      name: args.newName,
      description: originalChain.description,
      agents: originalChain.agents,
      createdAt: now,
      updatedAt: now,
    });

    return duplicateId;
  },
});
