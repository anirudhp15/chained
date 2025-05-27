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
    name: v.optional(v.string()),
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
      name: args.name,
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
        name: v.optional(v.string()),
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
        name: agent.name,
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

// NEW: File and attachment mutations
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createAttachment = mutation({
  args: {
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
    const attachmentId = await ctx.db.insert("attachments", {
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

export const addAttachmentToAgentStep = mutation({
  args: {
    stepId: v.id("agentSteps"),
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Agent step not found");

    const currentAttachments = step.attachmentIds || [];
    await ctx.db.patch(args.stepId, {
      attachmentIds: [...currentAttachments, args.attachmentId],
    });

    // Also update the attachment with the agent step ID
    await ctx.db.patch(args.attachmentId, {
      agentStepId: args.stepId,
    });
  },
});

export const addWebSearchResults = mutation({
  args: {
    stepId: v.id("agentSteps"),
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
  },
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Agent step not found");

    const currentSearchResults = step.webSearchResults || [];
    const newSearchResult = {
      query: args.query,
      results: args.results,
      searchedAt: Date.now(),
    };

    await ctx.db.patch(args.stepId, {
      webSearchResults: [...currentSearchResults, newSearchResult],
    });
  },
});

export const addAudioTranscription = mutation({
  args: {
    stepId: v.id("agentSteps"),
    originalText: v.string(),
    confidence: v.optional(v.number()),
    language: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      audioTranscription: {
        originalText: args.originalText,
        confidence: args.confidence,
        language: args.language,
        duration: args.duration,
      },
    });
  },
});

export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new Error("Attachment not found");

    // Delete the file from storage
    await ctx.storage.delete(attachment.storageId);

    // Remove from agent step if associated
    if (attachment.agentStepId) {
      const step = await ctx.db.get(attachment.agentStepId);
      if (step && step.attachmentIds) {
        const updatedAttachments = step.attachmentIds.filter(
          (id) => id !== args.attachmentId
        );
        await ctx.db.patch(attachment.agentStepId, {
          attachmentIds: updatedAttachments,
        });
      }
    }

    // Delete the attachment record
    await ctx.db.delete(args.attachmentId);
  },
});

// Performance tracking mutations
export const startAgentExecution = mutation({
  args: {
    stepId: v.id("agentSteps"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, {
      executionStartTime: Date.now(),
      isStreaming: true,
    });
  },
});

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
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endTime = Date.now();
    const step = await ctx.db.get(args.stepId);

    if (!step) throw new Error("Step not found");

    const duration = step.executionStartTime
      ? endTime - step.executionStartTime
      : 0;
    const tokensPerSecond =
      args.tokenUsage && duration > 0
        ? args.tokenUsage.totalTokens / (duration / 1000)
        : 0;

    await ctx.db.patch(args.stepId, {
      response: args.response,
      reasoning: args.reasoning,
      tokenUsage: args.tokenUsage,
      executionEndTime: endTime,
      executionDuration: duration,
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
      estimatedCost: args.estimatedCost,
      isComplete: true,
      isStreaming: false,
    });
  },
});
