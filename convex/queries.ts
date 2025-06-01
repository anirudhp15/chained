import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Get current user or null if not authenticated
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
  },
});

// Get all chat sessions for the authenticated user
export const getChatSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("chatSessions")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get a specific chat session with ownership verification
export const getChatSession = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return null; // Session not found or access denied
    }

    return session;
  },
});

// Get agent steps for a session with ownership verification
export const getAgentSteps = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return []; // Session not found or access denied
    }

    return await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

// Get previous agent steps for building context
export const getPreviousAgentSteps = query({
  args: {
    sessionId: v.id("chatSessions"),
    beforeIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return []; // Session not found or access denied
    }

    const allSteps = await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    return allSteps.filter((step) => step.index < args.beforeIndex);
  },
});

// Get a specific agent step with ownership verification
export const getAgentStep = query({
  args: {
    stepId: v.id("agentSteps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      throw new Error("Agent step not found or unauthorized");
    }

    return step;
  },
});

// Get file attachments for a session
export const getSessionAttachments = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return []; // Session not found or access denied
    }

    return await ctx.db
      .query("fileAttachments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

// Get file attachments for an agent step
export const getStepAttachments = query({
  args: {
    stepId: v.id("agentSteps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    // Verify user owns the agent step
    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      return []; // Step not found or access denied
    }

    return await ctx.db
      .query("fileAttachments")
      .withIndex("by_agent_step", (q) => q.eq("agentStepId", args.stepId))
      .order("desc")
      .collect();
  },
});

// Get attachment URL from storage ID
export const getAttachmentUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    // Find the attachment by storage ID and verify ownership
    const attachment = await ctx.db
      .query("fileAttachments")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();

    if (!attachment || attachment.userId !== user._id) {
      return null; // Attachment not found or access denied
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get user's file attachments
export const getUserAttachments = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    const baseQuery = ctx.db
      .query("fileAttachments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.limit) {
      return await baseQuery.take(args.limit);
    }

    return await baseQuery.collect();
  },
});

// Get user statistics
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    const [sessions, agentSteps, attachments] = await Promise.all([
      ctx.db
        .query("chatSessions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("agentSteps")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("fileAttachments")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    return {
      totalSessions: sessions.length,
      totalAgentSteps: agentSteps.length,
      totalAttachments: attachments.length,
      totalTokensUsed: agentSteps.reduce(
        (sum, step) => sum + (step.tokenUsage?.totalTokens || 0),
        0
      ),
      totalCost: agentSteps.reduce(
        (sum, step) => sum + (step.estimatedCost || 0),
        0
      ),
    };
  },
});

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Return default preferences if none exist
    return (
      preferences || {
        theme: "dark",
        language: "en",
        timezone: "UTC",
        emailNotifications: true,
        pushNotifications: true,
        weeklyDigest: true,
        defaultModel: "gpt-4",
        maxTokensPerRequest: 4000,
        temperature: 0.7,
        autoSaveChats: true,
        dataRetention: 90,
        shareUsageData: false,
      }
    );
  },
});

// Get user billing information
export const getUserBilling = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    const billing = await ctx.db
      .query("userBilling")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return (
      billing || {
        subscriptionStatus: "trialing",
        subscriptionPlan: "free",
        monthlyTokenUsage: 0,
        monthlyTokenLimit: 10000,
        monthlySpend: 0,
        hasPaymentMethod: false,
      }
    );
  },
});

// Get user activity data for charts
export const getUserActivity = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    const days = args.days || 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const agentSteps = await ctx.db
      .query("agentSteps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Group by day
    const activityByDay: Record<
      string,
      { date: string; sessions: number; tokens: number; cost: number }
    > = {};

    agentSteps.forEach((step) => {
      const date = new Date(step.timestamp).toISOString().split("T")[0];
      if (!activityByDay[date]) {
        activityByDay[date] = { date, sessions: 0, tokens: 0, cost: 0 };
      }
      activityByDay[date].sessions += 1;
      activityByDay[date].tokens += step.tokenUsage?.totalTokens || 0;
      activityByDay[date].cost += step.estimatedCost || 0;
    });

    return Object.values(activityByDay).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },
});

// Get supervisor turns for a session
export const getSupervisorTurns = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return [];
    }

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return []; // Session not found or access denied
    }

    return await ctx.db
      .query("supervisorTurns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

// Get latest supervisor turn for a session (for streaming)
export const getLatestSupervisorTurn = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
    }

    return await ctx.db
      .query("supervisorTurns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

// Get agent conversation history
export const getAgentConversationHistory = query({
  args: {
    sessionId: v.id("chatSessions"),
    agentIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
    }

    return await ctx.db
      .query("agentConversations")
      .withIndex("by_session_agent", (q) =>
        q.eq("sessionId", args.sessionId).eq("agentIndex", args.agentIndex)
      )
      .first();
  },
});
