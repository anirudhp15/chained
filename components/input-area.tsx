"use client";

import { useState, useEffect } from "react";
import { AgentInput, type Agent } from "./agent-input";
import { ConnectionSelector } from "./connection-selector";
import { v4 as uuidv4 } from "uuid";

interface InputAreaProps {
  onSendChain: (agents: Agent[]) => void;
  isLoading?: boolean;
  queuedAgents?: Agent[];
  isStreaming?: boolean;
  focusedAgentIndex?: number | null;
  focusedAgent?: Agent | null;
  onSendFocusedAgent?: (agent: Agent) => void;
}

export function InputArea({
  onSendChain,
  isLoading = false,
  queuedAgents = [],
  isStreaming = false,
  focusedAgentIndex,
  focusedAgent,
  onSendFocusedAgent,
}: InputAreaProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: uuidv4(),
      model: "gpt-4o",
      prompt: "",
    },
  ]);

  const [focusedAgentState, setFocusedAgentState] = useState<Agent | null>(
    null
  );

  // Initialize focused agent state when focus mode is activated
  useEffect(() => {
    if (focusedAgent && focusedAgentIndex !== null) {
      setFocusedAgentState({
        ...focusedAgent,
        prompt: "", // Start with empty prompt for new input
      });
    } else {
      setFocusedAgentState(null);
    }
  }, [focusedAgent, focusedAgentIndex]);

  const addAgent = () => {
    if (agents.length < 3) {
      setAgents([
        ...agents,
        {
          id: uuidv4(),
          model: "gpt-4o",
          prompt: "",
        },
      ]);
    }
  };

  const updateAgent = (index: number, updatedAgent: Agent) => {
    const newAgents = [...agents];
    newAgents[index] = updatedAgent;
    setAgents(newAgents);
  };

  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

  const handleSendChain = () => {
    const validAgents = agents.filter((agent) => agent.prompt.trim() !== "");
    if (validAgents.length > 0) {
      onSendChain(validAgents);
    }
  };

  const handleSendFocusedAgent = () => {
    if (
      focusedAgentState &&
      focusedAgentState.prompt.trim() !== "" &&
      onSendFocusedAgent
    ) {
      onSendFocusedAgent(focusedAgentState);
    }
  };

  const updateFocusedAgent = (updatedAgent: Agent) => {
    setFocusedAgentState(updatedAgent);
  };

  const canSend = agents.some((agent) => agent.prompt.trim() !== "");
  const canSendFocused = focusedAgentState?.prompt.trim() !== "";

  // Focus Mode Input
  if (focusedAgentIndex !== null && focusedAgentState) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="space-y-4">
            {/* Focus Mode Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-lavender-400 rounded-full"></div>
              <span className="text-sm text-gray-400">
                Focus Mode • Agent {(focusedAgentIndex ?? 0) + 1}
              </span>
            </div>

            {/* Enhanced Input Area */}
            <div className="relative">
              <textarea
                value={focusedAgentState.prompt}
                onChange={(e) =>
                  updateFocusedAgent({
                    ...focusedAgentState,
                    prompt: e.target.value,
                  })
                }
                placeholder={`Continue conversation with ${focusedAgentState.model}...`}
                className="w-full h-32 px-4 py-4 pb-16 bg-gray-800/70 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none transition-all text-base"
              />

              {/* Bottom controls */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Model Display */}
                  <div className="px-3 py-1.5 bg-gray-900/90 border border-gray-600/50 rounded-lg text-gray-300 text-sm backdrop-blur-sm">
                    <span className="font-medium">
                      {focusedAgentState.model}
                    </span>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendFocusedAgent}
                  disabled={!canSendFocused || isLoading || isStreaming}
                  className="flex items-center gap-2 px-4 py-2 bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none backdrop-blur-sm"
                >
                  {isLoading || isStreaming ? "Sending..." : "Send"}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Chain Mode Input
  return (
    <div className="fixed bottom-0 left-0 right-0 ">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 items-stretch justify-center">
          {agents.map((agent, index) => (
            <div
              key={agent.id}
              className="flex-1 min-w-[300px]  bg-gray-900/75 backdrop-blur-sm rounded-xl border-2 border-gray-800/50 p-4 space-y-3"
            >
              {/* Connection Selector for agents after the first */}
              {index > 0 && (
                <ConnectionSelector
                  connection={agent.connection}
                  onConnectionChange={(connection: Agent["connection"]) =>
                    updateAgent(index, { ...agent, connection })
                  }
                  isFirstAgent={index === 0}
                />
              )}

              {/* Agent Input */}
              <AgentInput
                agent={agent}
                onUpdate={(updatedAgent) => updateAgent(index, updatedAgent)}
                onRemove={() => removeAgent(index)}
                canRemove={agents.length > 1}
                index={index}
                onAddAgent={addAgent}
                canAddAgent={agents.length < 3}
                isLastAgent={index === agents.length - 1}
                onSendChain={handleSendChain}
                canSend={canSend}
                isLoading={isLoading || isStreaming}
              />

              {/* Queued Agent Indicator */}
              {queuedAgents.some((qa) => qa.id === agent.id) && (
                <div className="text-xs text-lavender-400/60 text-center">
                  Queued...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
