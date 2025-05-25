import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("chatSessions", {
      title: args.title,
      createdAt: Date.now(),
    });
    return sessionId;
  },
});

export const updateChatTitle = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title,
    });
  },
});

export const deleteChat = mutation({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    // First delete all agent steps associated with this session
    const agentSteps = await ctx.db
      .query("agentSteps")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();

    for (const step of agentSteps) {
      await ctx.db.delete(step._id);
    }

    // Then delete the chat session itself
    await ctx.db.delete(args.sessionId);
  },
});

export const addAgentStep = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    index: v.number(),
    model: v.string(),
    prompt: v.string(),
    connectionType: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("conditional"),
        v.literal("parallel")
      )
    ),
    connectionCondition: v.optional(v.string()),
    sourceAgentIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stepId = await ctx.db.insert("agentSteps", {
      sessionId: args.sessionId,
      index: args.index,
      model: args.model,
      prompt: args.prompt,
      timestamp: Date.now(),
      isComplete: false,
      connectionType: args.connectionType,
      connectionCondition: args.connectionCondition,
      sourceAgentIndex: args.sourceAgentIndex,
    });
    return stepId;
  },
});

export const updateAgentResponse = mutation({
  args: {
    stepId: v.id("agentSteps"),
    response: v.string(),
    reasoning: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
      })
    ),
    isComplete: v.optional(v.boolean()),
    isStreaming: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      response: args.response,
      reasoning: args.reasoning,
      tokenUsage: args.tokenUsage,
      isComplete: args.isComplete ?? true,
      isStreaming: args.isStreaming ?? false,
    });
  },
});

export const updateAgentStreaming = mutation({
  args: {
    stepId: v.id("agentSteps"),
    isStreaming: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      isStreaming: args.isStreaming,
    });
  },
});

export const updateStreamedContent = mutation({
  args: {
    stepId: v.id("agentSteps"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      streamedContent: args.content,
    });
  },
});

export const updateAgentError = mutation({
  args: {
    stepId: v.id("agentSteps"),
    error: v.string(),
    isComplete: v.optional(v.boolean()),
    isStreaming: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      error: args.error,
      isComplete: args.isComplete ?? true,
      isStreaming: args.isStreaming ?? false,
    });
  },
});

export const runAgentChain = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    agents: v.array(
      v.object({
        model: v.string(),
        prompt: v.string(),
        index: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Create agent steps for each agent in the chain
    const stepIds = [];
    for (const agent of args.agents) {
      const stepId = await ctx.db.insert("agentSteps", {
        sessionId: args.sessionId,
        index: agent.index,
        model: agent.model,
        prompt: agent.prompt,
        timestamp: Date.now(),
        isComplete: false,
      });
      stepIds.push(stepId);
    }

    // Note: In a real implementation, you would integrate with actual AI APIs here
    // For now, we'll just simulate responses
    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i];
      const agent = args.agents[i];

      // Simulate AI response (replace with actual AI API calls)
      const simulatedResponse = `This is a simulated response from ${agent.model} for: "${agent.prompt}"`;

      await ctx.db.patch(stepId, {
        response: simulatedResponse,
        isComplete: true,
      });
    }

    return stepIds;
  },
});

export const updateAgentSkipped = mutation({
  args: {
    stepId: v.id("agentSteps"),
    wasSkipped: v.boolean(),
    skipReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      wasSkipped: args.wasSkipped,
      skipReason: args.skipReason,
      isComplete: true,
      isStreaming: false,
    });
  },
});
