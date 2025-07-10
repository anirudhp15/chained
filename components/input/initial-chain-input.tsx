"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, BookOpen, Save } from "lucide-react";
import { AgentInput, type Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_AGENT_CONFIG,
  CONDITION_PRESETS,
  MAX_AGENTS_PER_CHAIN,
} from "@/lib/constants";
import { useSidebar } from "@/lib/sidebar-context";
import { NodePill } from "../ui/NodePill";
import {
  Plus,
  ArrowRight,
  ArrowDown,
  GitMerge,
  UserMinus,
  GitCommitHorizontal,
  GitFork,
  GitCompareArrows,
} from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";
import { SaveChainModal } from "../chains/save-chain-modal";
import { SavedChainsModal } from "../chains/saved-chains-modal";
import { PromptTemplates } from "./prompt-templates";

// Type alias for connection types to match Agent interface
type EnabledConnectionType =
  | "direct"
  | "conditional"
  | "parallel"
  | "collaborative";

// Connection types configuration (matching lib/constants.ts structure)
const CONNECTION_TYPES = [
  {
    type: "direct" as const,
    label: "Direct",
    Icon: GitCommitHorizontal,
    description: "Pass previous agent's output directly",
    color: "text-blue-400",
  },
  {
    type: "conditional" as const,
    label: "Conditional",
    Icon: IoGitBranchOutline,
    description: "Run only if a condition is met",
    color: "text-amber-400",
    iconRotate: "rotate-90",
  },
  {
    type: "parallel" as const,
    label: "Parallel",
    Icon: GitFork,
    description: "Run simultaneously",
    color: "text-purple-400",
    iconRotate: "rotate-90",
  },
  {
    type: "collaborative" as const,
    label: "Collaborative",
    Icon: GitCompareArrows,
    description: "Agents work together iteratively",
    color: "text-green-400",
    disabled: true,
  },
] satisfies Array<{
  type: EnabledConnectionType;
  label: string;
  Icon: React.ComponentType<any>;
  description: string;
  disabled?: boolean;
  color: string;
  iconRotate?: string;
}>;

// Mobile Connection Selector Component
const MobileConnectionSelector = ({
  agent,
  onUpdate,
  index,
}: {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  index: number;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<DOMRect | null>(null);
  const [showConditionInput, setShowConditionInput] = useState(false);

  const currentConnectionType = agent.connection?.type || "direct";
  const currentConnection = CONNECTION_TYPES.find(
    (c) => c.type === currentConnectionType
  );
  const CurrentConnectionIcon = currentConnection?.Icon;

  const handleConnectionTypeChange = (type: EnabledConnectionType) => {
    const baseConnection = {
      type,
      sourceAgentId: agent.connection?.sourceAgentId,
    };
    const newConnection =
      type === "conditional"
        ? { ...baseConnection, condition: agent.connection?.condition || "" }
        : baseConnection;

    onUpdate({ ...agent, connection: newConnection });
    setShowConditionInput(type === "conditional");
    setIsDropdownOpen(false);
  };

  const handleConditionChange = (condition: string) => {
    onUpdate({
      ...agent,
      connection: { ...agent.connection, type: "conditional", condition },
    });
  };

  const handlePresetSelect = (preset: (typeof CONDITION_PRESETS)[0]) => {
    handleConditionChange(preset.condition);
    setShowConditionInput(false);
  };

  const getModalPosition = (buttonRect?: DOMRect) => {
    return {
      top: `${(buttonRect?.top || 0) + window.scrollY - 8}px`,
      left: "5vw",
      right: "5vw",
      transform: "translateY(-100%)",
    };
  };

  const STYLES = {
    modal:
      "fixed bg-gray-800/98 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[999999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
    backdrop: "fixed inset-0 z-[999999] bg-black/20",
    input:
      "bg-gray-800/90 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50",
  };

  return (
    <div className="md:hidden flex flex-col gap-2 items-center justify-center py-1">
      <button
        onClick={(e) => {
          setButtonPosition(e.currentTarget.getBoundingClientRect());
          setIsDropdownOpen(!isDropdownOpen);
        }}
        className="flex items-center gap-1 px-3 py-1 bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg transition-all group backdrop-blur-sm"
      >
        {CurrentConnectionIcon && (
          <span
            className={`${currentConnection?.color || "text-gray-400"} ${currentConnection?.iconRotate || ""}`}
          >
            <CurrentConnectionIcon size={16} />
          </span>
        )}
        <span className="font-medium text-xs text-gray-300 group-hover:text-lavender-400">
          {currentConnection?.label}
        </span>
        <ChevronUp
          size={12}
          className={`text-gray-400 group-hover:text-lavender-400 transition-all ${
            isDropdownOpen ? "rotate-0" : "rotate-90"
          }`}
        />
      </button>

      {/* Connection Type Dropdown */}
      {isDropdownOpen &&
        createPortal(
          <>
            <div
              className={STYLES.backdrop}
              onClick={() => setIsDropdownOpen(false)}
            />
            <div
              className={`${STYLES.modal} min-w-48 w-max max-w-[90vw]`}
              style={getModalPosition(buttonPosition || undefined)}
            >
              {CONNECTION_TYPES.map((type) => {
                const TypeIcon = type.Icon;
                const isSelected = currentConnectionType === type.type;
                return (
                  <button
                    key={type.type}
                    onClick={() =>
                      !type.disabled && handleConnectionTypeChange(type.type)
                    }
                    disabled={type.disabled}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg flex items-center gap-3 transition-colors text-xs relative ${
                      isSelected
                        ? "bg-lavender-500/10 text-lavender-400"
                        : "text-white"
                    } ${type.disabled ? "bg-gray-800/50" : ""}`}
                  >
                    <span
                      className={`${type.color} ${type.iconRotate || ""} ${type.disabled ? "opacity-50" : ""}`}
                    >
                      <TypeIcon size={14} />
                    </span>
                    <div className="flex-1">
                      <div
                        className={`font-medium flex items-center gap-2 ${isSelected ? "text-lavender-400" : ""}`}
                      >
                        {type.label}
                        {type.disabled && (
                          <span className="text-xs px-2 py-0.5 bg-gray-700/50 border border-gray-600/30 rounded-full text-gray-400">
                            Coming Soon
                          </span>
                        )}
                        {isSelected && !type.disabled && (
                          <span className="ml-2 text-xs opacity-60">
                            Selected
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-gray-400 text-xs ${type.disabled ? "opacity-70" : ""}`}
                      >
                        {type.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}

      {/* Conditional Input */}
      {currentConnectionType === "conditional" && (
        <div className="w-full px-2">
          <div className="relative">
            <input
              type="text"
              value={agent.connection?.condition || ""}
              onChange={(e) => handleConditionChange(e.target.value)}
              placeholder="Enter condition..."
              className={`w-full px-3 py-1 rounded-md text-base md:text-xs ${STYLES.input}`}
              onFocus={() => setShowConditionInput(true)}
              onBlur={() => setTimeout(() => setShowConditionInput(false), 150)}
              style={{ fontSize: "16px" }}
            />

            {showConditionInput &&
              createPortal(
                <div
                  className={`${STYLES.modal} w-[90vw] p-2`}
                  style={{
                    top: `${window.scrollY + 100}px`,
                    left: "5vw",
                    right: "5vw",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-300">
                      Quick presets:
                    </span>
                    <button
                      onClick={() => setShowConditionInput(false)}
                      className="text-gray-400 hover:text-white text-xs hover:bg-gray-700/50 w-5 h-5 rounded flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {CONDITION_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePresetSelect(preset)}
                        className="w-full px-2 py-1.5 text-left text-white hover:bg-gray-600/70 rounded text-xs transition-colors"
                      >
                        <div className="font-medium text-lavender-400">
                          {preset.label}
                        </div>
                        <div className="text-gray-400 font-mono text-[10px]">
                          {preset.placeholder}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple connection icon component for desktop
const ConnectionIcon = ({ connectionType }: { connectionType?: string }) => {
  switch (connectionType) {
    case "conditional":
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full border border-yellow-500/30">
          <div className="w-3 h-3 border-2 border-yellow-400 rounded rotate-45"></div>
        </div>
      );
    case "parallel":
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full border border-blue-500/30">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-blue-400 rounded"></div>
            <div className="w-1 h-3 bg-blue-400 rounded"></div>
          </div>
        </div>
      );
    case "collaborative":
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 rounded-full border border-purple-500/30">
          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
        </div>
      );
    default: // direct
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-full border border-green-500/30">
          <div className="w-3 h-1 bg-green-400 rounded"></div>
        </div>
      );
  }
};

interface InitialChainInputProps {
  onSendChain: (agents: Agent[]) => void;
  isLoading?: boolean;
  queuedAgents?: Agent[];
  isStreaming?: boolean;
  presetAgents?: Agent[] | null;
  onClearPresetAgents?: () => void;
}

export function InitialChainInput({
  onSendChain,
  isLoading = false,
  queuedAgents = [],
  isStreaming = false,
  presetAgents,
  onClearPresetAgents,
}: InitialChainInputProps) {
  const initialAgent = {
    id: uuidv4(),
    ...DEFAULT_AGENT_CONFIG,
  };

  const [agents, setAgents] = useState<Agent[]>([initialAgent]);

  const [animatingAgentId, setAnimatingAgentId] = useState<string | null>(null);

  // Mobile-specific state for collapsible inputs - initialize with the first agent expanded
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(
    new Set([initialAgent.id])
  );
  const [showTooltip, setShowTooltip] = useState<{
    agentId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Saved chains modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);

  // Track previous agent count to detect add/remove operations
  const prevAgentCountRef = useRef(agents.length);
  const prevAgentIdsRef = useRef(agents.map((a) => a.id).join(","));

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

  // Auto-manage expanded state: always keep the last agent expanded
  useEffect(() => {
    const currentAgentCount = agents.length;
    const currentAgentIds = agents.map((a) => a.id).join(",");

    // Only auto-manage when agent count changes or IDs change (add/remove operations)
    if (
      currentAgentCount !== prevAgentCountRef.current ||
      currentAgentIds !== prevAgentIdsRef.current
    ) {
      if (agents.length > 0) {
        const lastAgentId = agents[agents.length - 1].id;
        setExpandedAgents(new Set([lastAgentId]));
      }

      // Update refs
      prevAgentCountRef.current = currentAgentCount;
      prevAgentIdsRef.current = currentAgentIds;
    }
  }, [agents]);

  // Calculate margin for desktop centering
  const getContainerStyle = () => {
    // Only apply margin on desktop (md and up)
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      if (agents.length === 1) {
        // For single agent, just offset from sidebar but don't force width
        return {
          marginLeft: `${sidebarWidth}px`,
          transition: "margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        };
      } else {
        // For multiple agents, take full remaining width
        return {
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
          transition:
            "margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        };
      }
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

  const addAgent = () => {
    if (agents.length < MAX_AGENTS_PER_CHAIN) {
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

  // Mobile interaction handlers
  const toggleAgentExpansion = (agentId: string) => {
    const isLastAgent = agents[agents.length - 1]?.id === agentId;

    // If it's the last agent, don't allow collapsing it
    if (isLastAgent) {
      return;
    }

    setExpandedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }

      return newSet;
    });
  };

  const handleLongPressStart = (agentId: string, event: React.TouchEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const timer = setTimeout(() => {
      setShowTooltip({
        agentId,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        },
      });
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const hideTooltip = () => {
    setShowTooltip(null);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Check if there's a current chain configuration (any non-empty prompts)
  const hasCurrentChain = agents.some((agent) => agent.prompt.trim() !== "");

  const handleSaveChain = () => {
    setShowSaveModal(true);
  };

  const handleBrowseChains = () => {
    setShowBrowseModal(true);
  };

  const handleLoadChain = (loadedAgents: Agent[]) => {
    setAgents(loadedAgents);
    // Reset mobile state - the useEffect will handle setting the expanded state
    hideTooltip();
  };

  const handleSaveSuccess = () => {
    // Could show a success toast here if desired
    console.log("Chain saved successfully");
  };

  const handleSendChain = () => {
    const validAgents = agents.filter((agent) => agent.prompt.trim() !== "");
    if (validAgents.length > 0) {
      onSendChain(validAgents);
      // Clear all prompts and reset to single agent after sending
      const newAgent = {
        id: uuidv4(),
        ...DEFAULT_AGENT_CONFIG,
      };
      setAgents([newAgent]);
      // Reset mobile state - the useEffect will handle setting the expanded state
      hideTooltip();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const canSend = agents.some((agent) => agent.prompt.trim() !== "");
  const canRemove = agents.length > 1;

  // Helper function to get consistent sizing for all agents
  const getAgentContainerClasses = () => {
    if (agents.length === 1) {
      return "w-full max-w-4xl mx-auto";
    } else {
      // For multiple agents, each takes equal space with flex-1
      return "w-full flex-1";
    }
  };

  // Helper function to get container layout classes based on agent count
  const getLayoutClasses = () => {
    if (agents.length === 1) {
      // Single agent: centered with max-width constraint
      return {
        outerContainer: "w-full flex justify-center",
        innerContainer: "w-full max-w-4xl",
        flexContainer:
          "flex flex-col lg:flex-row lg:items-end lg:justify-center w-full",
        agentWrapper:
          "flex relative flex-col lg:flex-row lg:items-stretch w-full",
      };
    } else {
      // Multiple agents: full width, evenly distributed
      return {
        outerContainer: "w-full",
        innerContainer: "w-full",
        flexContainer:
          "flex flex-col lg:flex-row lg:items-end lg:gap-2 w-full lg:px-4",
        agentWrapper:
          "flex relative flex-col lg:flex-row lg:items-stretch flex-1",
      };
    }
  };

  const layoutClasses = getLayoutClasses();

  // Regular Chain Mode Input - Mobile Responsive Layout
  return (
    <>
      {/* Mobile Save/Browse Controls - Fixed in top right corner */}
      <div
        className="lg:hidden fixed z-30 flex items-center gap-1"
        style={{
          top: `calc(env(safe-area-inset-top) + 1rem)`,
          right: "1rem",
        }}
      >
        {hasCurrentChain && (
          <>
            <button
              onClick={handleSaveChain}
              className="p-2  text-lavender-400/80 hover:text-lavender-400 transition-all duration-200 hover:scale-110 shadow-lg backdrop-blur-sm"
              title="Save current chain"
            >
              <Save size={16} />
            </button>
          </>
        )}
        <button
          onClick={handleBrowseChains}
          className="p-2  text-gray-400 hover:text-lavender-400 transition-all duration-200 hover:scale-110 shadow-lg backdrop-blur-sm"
          title="Browse saved chains"
        >
          <BookOpen size={16} />
        </button>
      </div>

      {/* Desktop Save/Browse Controls - Positioned relative to content area */}
      <div
        className="hidden lg:flex absolute z-30 items-center gap-2"
        style={{
          top: "1.5rem",
          right: "1.5rem",
        }}
      >
        {hasCurrentChain && (
          <button
            onClick={handleSaveChain}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900/80 hover:bg-gray-800/80 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg text-gray-400 hover:text-lavender-400 transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
            title="Save current chain configuration"
          >
            <Save size={16} />
            <span className="text-sm font-medium">Save Chain</span>
          </button>
        )}
        <button
          onClick={handleBrowseChains}
          className="flex items-center gap-2 px-3 py-2 bg-gray-900/80 hover:bg-gray-800/80 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg text-gray-400 hover:text-lavender-400 transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
          title="Browse saved chains"
        >
          <BookOpen size={16} />
          <span className="text-sm font-medium">
            {hasCurrentChain ? "Browse Saved" : "Load Saved Chain"}
          </span>
        </button>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-end"
        style={{
          paddingBottom:
            typeof window !== "undefined" && window.innerWidth >= 768
              ? "max(0.5rem, env(safe-area-inset-bottom))"
              : "0px",
          ...getContainerStyle(),
        }}
      >
        <div className="w-full flex flex-col items-center justify-end transition-all duration-300 ease-in-out h-full">
          {/* Prompt Templates - Desktop Only */}
          <div className="hidden w-full justify-center mb-2">
            <PromptTemplates onLoadTemplate={handleLoadChain} />
          </div>

          <div className="w-full flex justify-center ">
            <div className="w-full flex items-end justify-center lg:mb-2">
              <div className={layoutClasses.outerContainer}>
                <div className={layoutClasses.innerContainer}>
                  {/* Mobile: Vertical Stack, Desktop: Horizontal Layout */}
                  <div className={layoutClasses.flexContainer}>
                    {agents.map((agent, index) => (
                      <div
                        key={agent.id}
                        className={layoutClasses.agentWrapper}
                      >
                        {/* Agent Card using AgentInput component */}
                        <div
                          className={`${getAgentContainerClasses()} ${agents.length > 1 ? "" : ""} ${
                            queuedAgents.some((qa) => qa.id === agent.id)
                              ? "border-lavender-400/50"
                              : ""
                          } `}
                        >
                          <div
                            className={`${
                              animatingAgentId === agent.id
                                ? "animate-in slide-in-from-bottom-4 lg:slide-in-from-right-8 fade-in duration-300 ease-out"
                                : ""
                            }`}
                          >
                            <NodePill
                              agent={agent}
                              onUpdate={(updatedAgent) =>
                                updateAgent(index, updatedAgent)
                              }
                              index={index}
                              canAddAgent={agents.length < MAX_AGENTS_PER_CHAIN}
                              onAddAgent={
                                agents.length < MAX_AGENTS_PER_CHAIN
                                  ? addAgent
                                  : undefined
                              }
                              isLastAgent={index === agents.length - 1}
                              onRemove={() => removeAgent(index)}
                              canRemove={canRemove}
                              // Mobile-specific props
                              isExpanded={expandedAgents.has(agent.id)}
                              onToggleExpansion={() =>
                                toggleAgentExpansion(agent.id)
                              }
                              onLongPressStart={(e: React.TouchEvent) =>
                                handleLongPressStart(agent.id, e)
                              }
                              onLongPressEnd={handleLongPressEnd}
                              onTouchStart={hideTooltip}
                              // Indicate if this agent can be collapsed (not the last one)
                              isCollapsible={index !== agents.length - 1}
                              // Show connection for non-first agents on both mobile and desktop
                              showConnection={index > 0}
                              // Pass source agent name for connection display
                              sourceAgentName={
                                index > 0
                                  ? agents[index - 1]?.name || `Node ${index}`
                                  : undefined
                              }
                            />
                          </div>
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
                            // Mobile-specific props
                            isMobileCollapsed={!expandedAgents.has(agent.id)}
                          />

                          {/* Queued Agent Indicator */}
                          {queuedAgents.some((qa) => qa.id === agent.id) && (
                            <div className="text-xs text-lavender-400/60 text-center mt-0.5 lg:mt-1">
                              Queued...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Long-Press Tooltip */}
          {showTooltip &&
            createPortal(
              <div
                className="fixed z-[9999] bg-gray-900/95 backdrop-blur-sm border border-gray-600/50 rounded-lg p-3 max-w-xs shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  left: showTooltip.position.x - 150, // Center the tooltip
                  top: showTooltip.position.y - 80,
                  transform: "translateX(-50%)",
                }}
                onClick={hideTooltip}
              >
                <div className="text-sm text-white mb-2">
                  {agents.find((a) => a.id === showTooltip.agentId)?.prompt ||
                    "No prompt yet"}
                </div>
                <div className="text-xs text-gray-400 text-center">
                  Click to edit
                </div>
              </div>,
              document.body
            )}

          {/* Saved Chains Modals */}
          <SaveChainModal
            isOpen={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            agents={agents}
            onSaveSuccess={handleSaveSuccess}
          />

          <SavedChainsModal
            isOpen={showBrowseModal}
            onClose={() => setShowBrowseModal(false)}
            onLoadChain={handleLoadChain}
            hasCurrentChain={hasCurrentChain}
          />
        </div>
      </div>
    </>
  );
}
