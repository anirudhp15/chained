"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { AgentInput, type Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";
import {
  CONNECTION_TYPES,
  DEFAULT_AGENT_CONFIG,
  CONDITION_PRESETS,
  type EnabledConnectionType,
} from "@/lib/constants";
import { useSidebar } from "@/lib/sidebar-context";

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
                    className={`w-full px-3 py-2 text-left hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg flex items-center gap-3 transition-colors text-xs ${
                      isSelected
                        ? "bg-lavender-500/10 text-lavender-400"
                        : "text-white"
                    }`}
                  >
                    <span className={`${type.color} ${type.iconRotate || ""}`}>
                      <TypeIcon size={14} />
                    </span>
                    <div className="flex-1">
                      <div
                        className={`font-medium ${isSelected ? "text-lavender-400" : ""}`}
                      >
                        {type.label}
                        {isSelected && (
                          <span className="ml-2 text-xs opacity-60">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs">
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
              className={`w-full px-3 py-1 rounded-md text-xs ${STYLES.input}`}
              onFocus={() => setShowConditionInput(true)}
              onBlur={() => setTimeout(() => setShowConditionInput(false), 150)}
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
  const connectionConfig =
    CONNECTION_TYPES.find((c) => c.type === connectionType) ||
    CONNECTION_TYPES[0];
  const IconComponent = connectionConfig.Icon;

  return (
    <div className="hidden md:flex items-center justify-center px-0.5 md:px-2">
      <div className="flex items-center gap-2">
        <div className="">
          <IconComponent
            size={16}
            className={`md:w-6 md:h-6 ${connectionConfig.color} ${connectionConfig.iconRotate || ""}`}
          />
        </div>
      </div>
    </div>
  );
};

// Desktop Connection Selector Component
const DesktopConnectionSelector = ({
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
      left: `${Math.max(16, Math.min(buttonRect?.left || 0, window.innerWidth - 200))}px`,
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
    <div className="hidden md:flex flex-col items-center justify-center ">
      <button
        onClick={(e) => {
          setButtonPosition(e.currentTarget.getBoundingClientRect());
          setIsDropdownOpen(!isDropdownOpen);
        }}
        className="flex items-center justify-center p-2 hover:bg-gray-700/50 border border-gray-600/50 bg-gray-800/25 backdrop-blur-sm rounded-lg transition-all group"
        title={`Connection: ${currentConnection?.label}`}
      >
        {CurrentConnectionIcon && (
          <CurrentConnectionIcon
            size={24}
            className={`${currentConnection?.color || "text-gray-400"} ${currentConnection?.iconRotate || ""} group-hover:scale-110 transition-transform`}
          />
        )}
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
                    className={`w-full px-3 py-2 text-left bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg flex items-center gap-3 transition-colors text-xs ${
                      isSelected
                        ? "bg-lavender-500/10 text-lavender-400"
                        : "text-white"
                    }`}
                  >
                    <span className={`${type.color} ${type.iconRotate || ""}`}>
                      <TypeIcon size={14} />
                    </span>
                    <div className="flex-1">
                      <div
                        className={`font-medium ${isSelected ? "text-lavender-400" : ""}`}
                      >
                        {type.label}
                        {isSelected && (
                          <span className="ml-2 text-xs opacity-60">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs">
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
      {/* {currentConnectionType === "conditional" && (
        <div className="mt-2 w-48">
          <div className="relative">
            <input
              type="text"
              value={agent.connection?.condition || ""}
              onChange={(e) => handleConditionChange(e.target.value)}
              placeholder="Enter condition..."
              className={`w-full px-3 py-2 rounded-md text-xs ${STYLES.input}`}
              onFocus={() => setShowConditionInput(true)}
              onBlur={() => setTimeout(() => setShowConditionInput(false), 150)}
            />

            {showConditionInput &&
              createPortal(
                <div
                  className={`${STYLES.modal} w-64 p-2`}
                  style={{
                    top: `${window.scrollY + 200}px`,
                    left: `${Math.max(16, window.innerWidth / 2 - 128)}px`,
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
      )} */}
    </div>
  );
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
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: uuidv4(),
      ...DEFAULT_AGENT_CONFIG,
    },
  ]);

  const [animatingAgentId, setAnimatingAgentId] = useState<string | null>(null);

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

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

  const canSend = agents.some((agent) => agent.prompt.trim() !== "");
  const canRemove = agents.length > 1;

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
        <div className="w-full flex items-end justify-center px-1 md:px-0 py-2 ">
          <div className="w-full max-w-7xl">
            {/* Mobile: Vertical Stack, Desktop: Horizontal Layout */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-center gap-1.5 md:gap-0">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="flex flex-col md:flex-row md:items-stretch md:max-w-4xl"
                >
                  {/* Agent Card using AgentInput component */}
                  <div
                    className={`${
                      agents.length === 1
                        ? "w-full md:max-w-4xl md:min-w-[894px] "
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
                      onRemove={() => removeAgent(index)}
                      canRemove={canRemove}
                      index={index}
                      onAddAgent={agents.length < 3 ? addAgent : undefined}
                      canAddAgent={agents.length < 3}
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
                      <div className="text-xs text-lavender-400/60 text-center mt-0.5 md:mt-1">
                        Queued...
                      </div>
                    )}
                  </div>

                  {/* Connection Selector (between agents) */}
                  {index < agents.length - 1 && (
                    <div className="flex flex-col md:flex-row md:items-center justify-center md:px-2">
                      {/* Mobile: Interactive Connection Selector */}
                      <MobileConnectionSelector
                        agent={agents[index + 1]}
                        onUpdate={(updatedAgent) =>
                          updateAgent(index + 1, updatedAgent)
                        }
                        index={index + 1}
                      />

                      {/* Desktop: Interactive Connection Selector */}
                      <DesktopConnectionSelector
                        agent={agents[index + 1]}
                        onUpdate={(updatedAgent) =>
                          updateAgent(index + 1, updatedAgent)
                        }
                        index={index + 1}
                      />
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
