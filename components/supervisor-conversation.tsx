"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { MarkdownRenderer } from "./markdown-renderer";
import { ModelAvatar } from "./model-avatar";
import { Bot, User, Zap, CheckCircle, AlertCircle, Clock } from "lucide-react";

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
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Supervisor Mode
          </h3>
          <p className="text-gray-400 mb-4">
            Coordinate your agents by mentioning them in your messages. Use
            @Agent1, @Agent2, etc.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>• "@Agent1 analyze this data"</p>
            <p>• "@Agent2 summarize the findings"</p>
            <p>• "@Agent1 @Agent2 collaborate on this task"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-dark">
      <div className="max-w-4xl mx-auto px-6 py-6 pb-64 space-y-6">
        {supervisorTurns.map((turn) => (
          <div key={turn._id} className="space-y-4">
            {/* User Input */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  <p className="text-white whitespace-pre-wrap">
                    {turn.userInput}
                  </p>
                </div>
              </div>
            </div>

            {/* Supervisor Response */}
            {(turn.supervisorResponse ||
              turn.streamedContent ||
              turn.isStreaming ||
              supervisorStreamContent[turn._id]) && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/30">
                    {turn.isStreaming &&
                    !turn.supervisorResponse &&
                    !supervisorStreamContent[turn._id] ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                        <span className="text-sm">Supervisor thinking...</span>
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
              </div>
            )}

            {/* Mentioned Agents Status */}
            {turn.parsedMentions && turn.parsedMentions.length > 0 && (
              <div className="ml-12 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4" />
                  <span>Agent Executions</span>
                </div>
                {turn.parsedMentions.map((mention, index) => {
                  // Find the corresponding agent step
                  const agentStep = agentSteps?.find(
                    (step) => step.index === mention.agentIndex
                  );

                  return (
                    <div
                      key={index}
                      className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {agentStep && (
                          <ModelAvatar model={agentStep.model} size="xs" />
                        )}
                        <span className="text-sm font-medium text-white">
                          {mention.agentName}
                        </span>
                        {agentStep && (
                          <span className="text-xs text-gray-400">
                            {agentStep.model}
                          </span>
                        )}
                        {agentStep ? (
                          agentStep.isStreaming ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                              <span className="text-xs text-blue-400">
                                Working
                              </span>
                            </div>
                          ) : agentStep.isComplete && !agentStep.error ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : agentStep.error ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          )
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>

                      {/* Task Description */}
                      <div className="text-xs text-gray-400 mb-2">
                        Task: {mention.taskPrompt}
                      </div>

                      {/* Agent Response or Status */}
                      {agentStep ? (
                        agentStep.error ? (
                          <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-700/30">
                            Error: {agentStep.error}
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
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                              <span>Processing supervisor task...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Waiting to execute...
                          </div>
                        )
                      ) : (
                        <div className="text-sm text-gray-500">
                          Waiting to execute...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error Display */}
            {turn.error && (
              <div className="ml-12">
                <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Supervisor Error</span>
                  </div>
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
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
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
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
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
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
            <span>Generating response...</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Waiting to execute...</div>
      )}
    </div>
  );
}
