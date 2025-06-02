"use client";

import { useState, useEffect } from "react";
import { AgentInput, type Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";
import { ModalityIcons } from "../modality/ModalityIcons";
import { CONNECTION_TYPES, DEFAULT_AGENT_CONFIG } from "@/lib/constants";
import { useSidebar } from "@/lib/sidebar-context";
import { usePerformance } from "@/lib/performance-context";
import { BarChart3, Pencil } from "lucide-react";

// Simple connection icon component
const ConnectionIcon = ({ connectionType }: { connectionType?: string }) => {
  const connectionConfig =
    CONNECTION_TYPES.find((c) => c.type === connectionType) ||
    CONNECTION_TYPES[0];
  const IconComponent = connectionConfig.Icon;

  return (
    <div className="flex items-center justify-center px-1 md:px-2">
      <div className="flex items-center gap-2">
        <div className="">
          <IconComponent
            size={20}
            className={`md:w-6 md:h-6 ${connectionConfig.color} ${connectionConfig.iconRotate || ""}`}
          />
        </div>
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
  presetAgents?: Agent[] | null;
  onClearPresetAgents?: () => void;
}

export function InputArea({
  onSendChain,
  isLoading = false,
  queuedAgents = [],
  isStreaming = false,
  focusedAgentIndex,
  focusedAgent,
  onSendFocusedAgent,
  presetAgents,
  onClearPresetAgents,
}: InputAreaProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: uuidv4(),
      ...DEFAULT_AGENT_CONFIG,
    },
  ]);

  const [focusedAgentState, setFocusedAgentState] = useState<Agent | null>(
    null
  );

  const [animatingAgentId, setAnimatingAgentId] = useState<string | null>(null);

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

  // Get performance state
  const { showDetailedPerformance, togglePerformance } = usePerformance();

  // Focused agent name editing state
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  // Calculate margin for desktop centering
  const getContainerStyle = () => {
    // Only apply margin on desktop (md and up)
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      return {
        marginLeft: `${sidebarWidth}px`,
        width: `calc(100% - ${sidebarWidth}px)`,
        transition:
          "margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      };
    }
    return {};
  };

  // Handle preset loading
  useEffect(() => {
    if (presetAgents && presetAgents.length > 0) {
      setAgents(presetAgents);
      // Clear the preset agents state after loading
      if (onClearPresetAgents) {
        onClearPresetAgents();
      }
    }
  }, [presetAgents, onClearPresetAgents]);

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
        ...DEFAULT_AGENT_CONFIG,
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
          ...DEFAULT_AGENT_CONFIG,
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
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/50"
        style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
          ...getContainerStyle(),
        }}
      >
        <div className="w-full flex justify-center">
          <div className="w-full max-w-4xl mx-auto p-6">
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
                  className="w-full h-32 px-4 py-4 pb-16 bg-gray-800/70 border border-gray-600/50 text-white placeholder-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none transition-all text-base md:text-base"
                  style={{ fontSize: "16px" }}
                />

                {/* Bottom controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Performance Toggle */}
                    <button
                      onClick={togglePerformance}
                      className={`flex items-center justify-center p-2 rounded-md transition-all ${
                        showDetailedPerformance
                          ? "text-lavender-400 bg-lavender-500/20 hover:bg-lavender-500/30"
                          : "text-gray-400 hover:text-lavender-400 hover:bg-gray-700/50"
                      }`}
                      title={
                        showDetailedPerformance
                          ? "Hide detailed performance"
                          : "Show detailed performance"
                      }
                    >
                      <BarChart3 size={18} />
                    </button>

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
                      onWebSearchToggle={(enabled) =>
                        updateFocusedAgent({
                          ...focusedAgentState,
                          webSearchEnabled: enabled,
                        })
                      }
                      isWebSearchEnabled={focusedAgentState.webSearchEnabled}
                      images={focusedAgentState.images || []}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendFocusedAgent}
                    disabled={!canSendFocused || isLoading || isStreaming}
                    className="flex items-center gap-2 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none backdrop-blur-sm"
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
      </div>
    );
  }

  // Regular Chain Mode Input - Mobile Responsive Layout
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        ...getContainerStyle(),
      }}
    >
      <div className="w-full flex justify-center">
        <div className="w-full flex items-end justify-center px-2 md:px-6 py-2 md:py-6">
          <div className="w-full max-w-6xl">
            {/* Mobile: Vertical Stack, Desktop: Horizontal Layout */}
            <div className="flex flex-col md:flex-row md:items-stretch md:justify-center gap-2 md:gap-0">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="flex flex-col md:flex-row md:items-stretch"
                >
                  {/* Agent Card using AgentInput component */}
                  <div
                    className={`${
                      agents.length === 1
                        ? "w-full md:max-w-4xl md:min-w-[800px]"
                        : agents.length === 2
                          ? "w-full md:max-w-none md:min-w-[550px] md:flex-1"
                          : "w-full md:max-w-none md:min-w-[450px] md:flex-1"
                    } backdrop-blur-sm ${
                      queuedAgents.some((qa) => qa.id === agent.id)
                        ? "border-lavender-400/50"
                        : ""
                    } ${
                      animatingAgentId === agent.id
                        ? "animate-in slide-in-from-bottom-4 md:slide-in-from-right-8 fade-in duration-300 ease-out"
                        : ""
                    }`}
                  >
                    <AgentInput
                      agent={agent}
                      onUpdate={(updatedAgent) =>
                        updateAgent(index, updatedAgent)
                      }
                      index={index}
                      isLastAgent={index === agents.length - 1}
                      onSendChain={
                        index === agents.length - 1
                          ? handleSendChain
                          : undefined
                      }
                      canSend={canSend}
                      isLoading={isLoading || isStreaming}
                    />

                    {/* Queued Agent Indicator */}
                    {queuedAgents.some((qa) => qa.id === agent.id) && (
                      <div className="text-xs text-lavender-400/60 text-center mt-1">
                        Queued...
                      </div>
                    )}
                  </div>

                  {/* Connection Selector (between agents) */}
                  {index < agents.length - 1 && (
                    <div className="flex md:items-center justify-center py-1 md:py-0 md:px-2">
                      <div className="flex items-center gap-2">
                        <div className="transform md:transform-none rotate-90 md:rotate-0">
                          <ConnectionIcon
                            connectionType={agents[index + 1].connection?.type}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
