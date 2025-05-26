import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const getRecentChats = query({
  handler: async (ctx) => {
    return await ctx.db.query("chatSessions").order("desc").take(20);
  },
});

export const getAgentSteps = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const getPreviousAgentSteps = query({
  args: {
    sessionId: v.id("chatSessions"),
    beforeIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.lt(q.field("index"), args.beforeIndex))
      .order("asc")
      .collect();
  },
});

// NEW: Attachment queries
export const getAttachmentsBySession = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getAttachmentsByAgentStep = query({
  args: { agentStepId: v.id("agentSteps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_agent_step", (q) => q.eq("agentStepId", args.agentStepId))
      .collect();
  },
});

export const getAttachment = query({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attachmentId);
  },
});

export const getAttachmentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Enhanced agent steps query to include attachment data
export const getAgentStepsWithAttachments = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("agentSteps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Fetch attachments for each step
    const stepsWithAttachments = await Promise.all(
      steps.map(async (step) => {
        let attachments: Array<Doc<"attachments"> & { url: string | null }> =
          [];
        if (step.attachmentIds && step.attachmentIds.length > 0) {
          const attachmentPromises = step.attachmentIds.map(
            async (attachmentId) => {
              const attachment = await ctx.db.get(attachmentId);
              if (attachment) {
                const url = await ctx.storage.getUrl(attachment.storageId);
                return { ...attachment, url };
              }
              return null;
            }
          );
          const attachmentResults = await Promise.all(attachmentPromises);
          attachments = attachmentResults.filter(
            (attachment): attachment is NonNullable<typeof attachment> =>
              attachment !== null
          );
        }
        return { ...step, attachments };
      })
    );

    return stepsWithAttachments;
  },
});
