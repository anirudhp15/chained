"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { ModelAvatar } from "../chat/model-avatar";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface SupervisorConversationProps {
  sessionId: Id<"chatSessions">;
  supervisorStreamContent?: { [turnId: string]: string };
}

export function SupervisorConversation({
  sessionId,
  supervisorStreamContent = {},
}: SupervisorConversationProps) {
  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
    sessionId,
  });

  // Get agent steps for the session to show updated content
  const agentSteps = useQuery(api.queries.getAgentSteps, {
    sessionId,
  });

  if (!supervisorTurns || supervisorTurns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-medium text-white mb-4">
            Supervisor Mode
          </h3>
          <p className="text-gray-400 mb-6">
            Coordinate your agents by mentioning them in your messages. Use
            @Agent1, @Agent2, etc.
          </p>
          <div className="text-sm text-gray-500 space-y-2 border border-gray-700 rounded-lg p-4">
            <p>"@Agent1 analyze this data"</p>
            <p>"@Agent2 summarize the findings"</p>
            <p>"@Agent1 @Agent2 collaborate on this task"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 pb-64 space-y-8">
        {supervisorTurns.map((turn) => (
          <div key={turn._id} className="space-y-4">
            {/* User Input */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                User
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <p className="text-white whitespace-pre-wrap leading-relaxed">
                  {turn.userInput}
                </p>
              </div>
            </div>

            {/* Supervisor Response */}
            {(turn.supervisorResponse ||
              turn.streamedContent ||
              turn.isStreaming ||
              supervisorStreamContent[turn._id]) && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Supervisor
                </div>
                <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-600/30">
                  {turn.isStreaming &&
                  !turn.supervisorResponse &&
                  !supervisorStreamContent[turn._id] ? (
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="animate-pulse w-2 h-2 bg-slate-400 rounded-full"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <MarkdownRenderer
                      content={
                        supervisorStreamContent[turn._id] ||
                        turn.supervisorResponse ||
                        turn.streamedContent ||
                        ""
                      }
                      isStreaming={turn.isStreaming}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Mentioned Agents Status */}
            {turn.parsedMentions && turn.parsedMentions.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Agent Executions
                </div>
                <div className="space-y-3">
                  {turn.parsedMentions.map((mention, index) => {
                    // Find the corresponding agent step
                    const agentStep = agentSteps?.find(
                      (step) => step.index === mention.agentIndex
                    );

                    return (
                      <div
                        key={index}
                        className="bg-gray-800/20 rounded-lg border border-gray-700/40 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-700/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {agentStep && (
                                <ModelAvatar
                                  model={agentStep.model}
                                  size="xs"
                                />
                              )}
                              <div>
                                <span className="text-sm font-medium text-white">
                                  {mention.agentName}
                                </span>
                                {agentStep && (
                                  <div className="text-xs text-gray-400">
                                    {agentStep.model}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {agentStep ? (
                                agentStep.isStreaming ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full"></div>
                                    <span className="text-xs text-blue-400 font-medium">
                                      WORKING
                                    </span>
                                  </div>
                                ) : agentStep.isComplete && !agentStep.error ? (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                    <span className="text-xs text-green-400 font-medium">
                                      COMPLETE
                                    </span>
                                  </div>
                                ) : agentStep.error ? (
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                    <span className="text-xs text-red-400 font-medium">
                                      ERROR
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-yellow-400" />
                                    <span className="text-xs text-yellow-400 font-medium">
                                      PENDING
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-yellow-400" />
                                  <span className="text-xs text-yellow-400 font-medium">
                                    PENDING
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Task Description */}
                          <div className="mt-2 text-xs text-gray-400">
                            {mention.taskPrompt}
                          </div>
                        </div>

                        {/* Agent Response or Status */}
                        <div className="p-4">
                          {agentStep ? (
                            agentStep.error ? (
                              <div className="text-sm text-red-300 bg-red-900/20 p-3 rounded border border-red-700/30">
                                {agentStep.error}
                              </div>
                            ) : agentStep.response ? (
                              <div className="text-sm text-gray-300">
                                <MarkdownRenderer
                                  content={agentStep.response}
                                  isStreaming={agentStep.isStreaming}
                                />
                              </div>
                            ) : agentStep.streamedContent ? (
                              <div className="text-sm text-gray-300">
                                <MarkdownRenderer
                                  content={agentStep.streamedContent}
                                  isStreaming={agentStep.isStreaming}
                                />
                              </div>
                            ) : agentStep.isStreaming ? (
                              <div className="text-sm text-gray-400">
                                <div className="flex items-center gap-3">
                                  <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span>Processing task...</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Awaiting execution
                              </div>
                            )
                          ) : (
                            <div className="text-sm text-gray-500">
                              Awaiting execution
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {turn.error && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-red-400 uppercase tracking-wide">
                  Error
                </div>
                <div className="text-sm text-red-300 bg-red-900/20 p-4 rounded border border-red-700/30">
                  {turn.error}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Keep the old component structure but deprecated
function AgentExecutionDisplay({ stepId }: { stepId: Id<"agentSteps"> }) {
  const agentStep = useQuery(api.queries.getAgentStep, { stepId });

  if (!agentStep) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-400">
          Loading agent execution...
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-3 mb-2">
        <ModelAvatar model={agentStep.model} size="xs" />
        <span className="text-sm font-medium text-white">
          {agentStep.name || `Agent ${agentStep.index + 1}`}
        </span>
        <span className="text-xs text-gray-400">{agentStep.model}</span>
        {agentStep.isComplete ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : agentStep.error ? (
          <AlertCircle className="w-4 h-4 text-red-400" />
        ) : (
          <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full"></div>
        )}
      </div>

      {agentStep.error ? (
        <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-700/30">
          Error: {agentStep.error}
        </div>
      ) : agentStep.response || agentStep.streamedContent ? (
        <div className="text-sm text-gray-300">
          <MarkdownRenderer
            content={agentStep.response || agentStep.streamedContent || ""}
          />
        </div>
      ) : agentStep.isStreaming ? (
        <div className="text-sm text-gray-400">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Generating response...</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Waiting to execute...</div>
      )}
    </div>
  );
}
