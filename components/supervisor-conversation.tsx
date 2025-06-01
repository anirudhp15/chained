"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { MarkdownRenderer } from "./markdown-renderer";
import { ModelAvatar } from "./model-avatar";
import { Bot, User, Zap, CheckCircle, AlertCircle } from "lucide-react";

interface SupervisorConversationProps {
  sessionId: Id<"chatSessions">;
}

export function SupervisorConversation({
  sessionId,
}: SupervisorConversationProps) {
  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
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
            {(turn.supervisorResponse || turn.isStreaming) && (
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/30">
                    {turn.isStreaming && !turn.supervisorResponse ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                        <span className="text-sm">Supervisor thinking...</span>
                      </div>
                    ) : (
                      <MarkdownRenderer
                        content={turn.supervisorResponse || ""}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Agent Executions */}
            {turn.executedStepIds && turn.executedStepIds.length > 0 && (
              <div className="ml-12 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4" />
                  <span>Agent Executions</span>
                </div>
                {turn.executedStepIds.map((stepId, index) => (
                  <AgentExecutionDisplay key={stepId} stepId={stepId} />
                ))}
              </div>
            )}

            {/* Parsed Mentions Display */}
            {turn.parsedMentions && turn.parsedMentions.length > 0 && (
              <div className="ml-12">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <span>Mentioned Agents:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {turn.parsedMentions.map((mention, index) => (
                    <div
                      key={index}
                      className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300 border border-gray-600/50"
                    >
                      @{mention.agentName} → {mention.taskPrompt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to display individual agent execution results
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
