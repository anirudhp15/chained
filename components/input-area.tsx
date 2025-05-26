"use client";

import { useState, useEffect } from "react";
import { AgentInput, type Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";
import { ModalityIcons } from "./modality/ModalityIcons";
import { GitCommitHorizontal, GitFork } from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";

// Simple connection icon component
const ConnectionIcon = ({ connectionType }: { connectionType?: string }) => {
  const getConnectionIcon = () => {
    switch (connectionType) {
      case "conditional":
        return (
          <IoGitBranchOutline size={16} className="text-amber-400 rotate-90" />
        );
      case "parallel":
        return <GitFork size={16} className="text-purple-400 rotate-90" />;
      case "direct":
      default:
        return <GitCommitHorizontal size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex items-center justify-center px-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-px bg-gray-600"></div>
        <div className="p-2 bg-gray-800/90 border border-gray-600/50 rounded-full backdrop-blur-sm">
          {getConnectionIcon()}
        </div>
        <div className="w-1 h-px bg-gray-600"></div>
      </div>
    </div>
  );
};

interface InputAreaProps {
  onSendChain: (agents: Agent[]) => void;
  isLoading?: boolean;
  queuedAgents?: Agent[];
  isStreaming?: boolean;
  focusedAgentIndex?: number | null;
  focusedAgent?: Agent | null;
  onSendFocusedAgent?: (agent: Agent) => void;
  onLoadPreset?: (agents: Agent[]) => void;
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
      model: "gpt-4o-mini",
      prompt: "",
    },
  ]);

  const [focusedAgentState, setFocusedAgentState] = useState<Agent | null>(
    null
  );

  const [animatingAgentId, setAnimatingAgentId] = useState<string | null>(null);

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
      const newAgent = {
        id: uuidv4(),
        model: "gpt-4o-mini",
        prompt: "",
      };

      setAnimatingAgentId(newAgent.id);
      setAgents([...agents, newAgent]);

      // Remove animation state after animation completes
      setTimeout(() => {
        setAnimatingAgentId(null);
      }, 400);
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
      // Clear all prompts and reset to single agent after sending
      setAgents([
        {
          id: uuidv4(),
          model: "gpt-4o-mini",
          prompt: "",
        },
      ]);
    }
  };

  const handleSendFocusedAgent = () => {
    if (
      focusedAgentState &&
      focusedAgentState.prompt.trim() !== "" &&
      onSendFocusedAgent
    ) {
      onSendFocusedAgent(focusedAgentState);
      // Clear the focused agent prompt after sending
      setFocusedAgentState({
        ...focusedAgentState,
        prompt: "",
      });
    }
  };

  const updateFocusedAgent = (updatedAgent: Agent) => {
    setFocusedAgentState(updatedAgent);
  };

  const canSend = agents.some((agent) => agent.prompt.trim() !== "");
  const canSendFocused = focusedAgentState?.prompt.trim() !== "";
  const canRemove = agents.length > 1;

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

                  {/* Modality Icons */}
                  <ModalityIcons
                    selectedModel={focusedAgentState.model}
                    onImagesChange={(images) =>
                      updateFocusedAgent({ ...focusedAgentState, images })
                    }
                    onAudioRecording={(audioBlob, duration) =>
                      updateFocusedAgent({
                        ...focusedAgentState,
                        audioBlob,
                        audioDuration: duration,
                      })
                    }
                    onWebSearch={(webSearchData) =>
                      updateFocusedAgent({
                        ...focusedAgentState,
                        webSearchData,
                      })
                    }
                    images={focusedAgentState.images || []}
                  />
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

  // Regular Chain Mode Input - Horizontal Layout
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="h-full flex items-end justify-center px-4">
        <div className="w-full py-6 max-w-[calc(100vw-280px)]">
          <div className="flex items-stretch justify-center">
            {agents.map((agent, index) => (
              <div key={agent.id} className="flex items-stretch">
                {/* Agent Card using AgentInput component */}
                <div
                  className={`${
                    agents.length === 1
                      ? "w-full max-w-4xl min-w-[800px]"
                      : agents.length === 2
                        ? "w-full max-w-none min-w-[550px] flex-1"
                        : "w-full max-w-none min-w-[450px] flex-1"
                  } bg-gray-900/75 backdrop-blur-sm rounded-xl border-2 border-gray-800/50 p-4 ${
                    queuedAgents.some((qa) => qa.id === agent.id)
                      ? "border-lavender-400/50"
                      : ""
                  } ${
                    animatingAgentId === agent.id
                      ? "animate-in slide-in-from-right-8 fade-in duration-300 ease-out"
                      : ""
                  }`}
                >
                  <AgentInput
                    agent={agent}
                    onUpdate={(updatedAgent) =>
                      updateAgent(index, updatedAgent)
                    }
                    onRemove={() => removeAgent(index)}
                    canRemove={canRemove}
                    index={index}
                    onAddAgent={agents.length < 3 ? addAgent : undefined}
                    canAddAgent={agents.length < 3}
                    isLastAgent={index === agents.length - 1}
                    onSendChain={
                      index === agents.length - 1 ? handleSendChain : undefined
                    }
                    canSend={canSend}
                    isLoading={isLoading || isStreaming}
                  />

                  {/* Queued Agent Indicator */}
                  {queuedAgents.some((qa) => qa.id === agent.id) && (
                    <div className="text-xs text-lavender-400/60 text-center mt-2">
                      Queued...
                    </div>
                  )}
                </div>

                {/* Connection Selector (between agents) */}
                {index < agents.length - 1 && (
                  <ConnectionIcon
                    connectionType={agents[index + 1].connection?.type}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
