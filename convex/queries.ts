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

    const step = await ctx.db.get(args.stepId);
    if (!step || step.userId !== user._id) {
      return null; // Step not found or access denied
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
