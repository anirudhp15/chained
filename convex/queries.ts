import { query } from "./_generated/server";
import { v } from "convex/values";

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
