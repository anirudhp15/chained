"use client";

import { useState } from "react";
import {
  ChevronUp,
  GitCompareArrows,
  Zap,
  GitCommitHorizontal,
  GitFork,
} from "lucide-react";
import {
  IoLayers,
  IoGitBranchOutline,
  IoArrowForwardCircleSharp,
} from "react-icons/io5";
import type { Agent } from "./agent-input";

type EnabledConnectionType = "direct" | "conditional" | "parallel";
type AllConnectionType = EnabledConnectionType | "collaborative";

interface ConnectionSelectorProps {
  connection: Agent["connection"];
  onConnectionChange: (connection: Agent["connection"]) => void;
  isFirstAgent: boolean;
}

interface ConnectionBadgeProps {
  type: EnabledConnectionType;
  sourceAgentIndex?: number;
  condition?: string;
  className?: string;
  size?: "sm" | "default";
  agents?: Array<{ index: number; name?: string; connectionType?: string }>;
}

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
  type: AllConnectionType;
  label: string;
  Icon: React.ComponentType<any>;
  description: string;
  color: string;
  disabled?: boolean;
  iconRotate?: string;
}>;

const CONDITION_PRESETS = [
  {
    label: "Contains keyword",
    condition: "contains('keyword')",
    placeholder: "contains('error')",
  },
  {
    label: "Starts with",
    condition: "starts_with('text')",
    placeholder: "starts_with('SUCCESS')",
  },
  {
    label: "Ends with",
    condition: "ends_with('text')",
    placeholder: "ends_with('.')",
  },
  {
    label: "Length greater than",
    condition: "length > 100",
    placeholder: "length > 50",
  },
  {
    label: "Length less than",
    condition: "length < 100",
    placeholder: "length < 200",
  },
  {
    label: "Not empty",
    condition: "length > 0",
    placeholder: "length > 0",
  },
];

export function ConnectionBadge({
  type,
  sourceAgentIndex,
  condition,
  className = "",
  size = "default",
  agents = [],
}: ConnectionBadgeProps) {
  const connection = CONNECTION_TYPES.find((t) => t.type === type);
  const IconComponent = connection?.Icon;
  const iconSize = size === "sm" ? 12 : 14;
  const iconRotate = connection?.iconRotate || "";

  // For parallel agents, find all other parallel agents in the same group
  const getParallelAgentNames = () => {
    if (type !== "parallel") return "";

    // Find current agent
    const currentAgent = agents.find(
      (agent) => agent.index === sourceAgentIndex
    );
    if (!currentAgent) return "";

    // Find all parallel agents (including current agent)
    const allParallelAgents = agents.filter(
      (agent) =>
        agent.connectionType === "parallel" ||
        // Also include agents adjacent to parallel agents (to catch first agent in parallel group)
        (agent.index > 0 &&
          agents[agent.index - 1]?.connectionType === "parallel") ||
        (agent.index < agents.length - 1 &&
          agents[agent.index + 1]?.connectionType === "parallel")
    );

    // Get other parallel agents (excluding current)
    const otherParallelAgents = allParallelAgents.filter(
      (agent) => agent.index !== sourceAgentIndex
    );

    // If no other parallel agents, show the current agent name
    if (otherParallelAgents.length === 0) {
      return currentAgent.name || `Node ${(sourceAgentIndex || 0) + 1}`;
    }

    // Return names of other parallel agents separated by "|"
    return otherParallelAgents
      .map((agent) => agent.name || `Node ${agent.index + 1}`)
      .join(" | ");
  };

  // Get the source agent's name (for non-parallel connections)
  const sourceAgent = agents.find((agent) => agent.index === sourceAgentIndex);
  const sourceAgentName =
    sourceAgent?.name || `Node ${(sourceAgentIndex || 0) + 1}`;

  const getTypeColor = () => {
    switch (type) {
      case "direct":
        return "text-blue-400";
      case "conditional":
        return "text-amber-400";
      case "parallel":
        return "text-purple-400";
    }
  };

  const textSize = size === "sm" ? "text-xs" : "text-xs ";

  // For parallel connections, get the parallel agent names
  const displayName = type === "parallel" ? "Parallel" : sourceAgentName;

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative group">
        <div
          className={`flex items-center gap-1 md:gap-1.5 ${getTypeColor()} ${textSize} font-medium`}
        >
          {IconComponent && (
            <span
              className={`flex items-center ${iconRotate} md:rotate-0 rotate-90`}
            >
              <IconComponent size={iconSize} />
            </span>
          )}

          {/* <span className="text-gray-300">chained from</span> */}
          {/* <span className="font-semibold hidden md:inline">{displayName}</span>
          <span className="font-semibold md:hidden text-xs">
            {displayName.split(" ")[0]}{" "}
            {displayName.split(" ").length > 1 && displayName.split(" ")[1]}
          </span> */}
        </div>

        {/* Hover tooltip for conditional conditions */}
        {type === "conditional" && condition && (
          <div className="absolute top-full mt-2 px-2 md:px-3 py-1.5 md:py-2 bg-gray-900/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] whitespace-nowrap">
            <div className="text-xs text-gray-300 mb-1">Condition:</div>
            <code className="text-xs font-mono text-amber-300">
              {condition}
            </code>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-600/50"></div>
          </div>
        )}

        {/* Hover tooltip for parallel relationships */}
        {type === "parallel" && (
          <div className="absolute top-full mt-2 px-2 md:px-3 py-1.5 md:py-2 bg-gray-900/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] whitespace-nowrap">
            <div className="text-xs text-gray-300 mb-1">
              Executing in parallel with:
            </div>
            <div className="text-xs font-medium text-purple-300">
              {displayName}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-600/50"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectionSelector({
  connection,
  onConnectionChange,
  isFirstAgent,
}: ConnectionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  if (isFirstAgent) {
    return null; // First agent doesn't have connections
  }

  const currentType = connection?.type || "direct";
  const currentConnection = CONNECTION_TYPES.find(
    (c) => c.type === currentType
  );
  const CurrentIcon = currentConnection?.Icon;

  const handleTypeChange = (type: EnabledConnectionType) => {
    if (type === "conditional") {
      onConnectionChange({
        type,
        condition: connection?.condition || "",
        sourceAgentId: connection?.sourceAgentId,
      });
      setShowConditionInput(true);
    } else {
      onConnectionChange({
        type,
        sourceAgentId: connection?.sourceAgentId,
      });
      setShowConditionInput(false);
    }
    setIsOpen(false);
  };

  const handleConditionChange = (condition: string) => {
    onConnectionChange({
      ...connection,
      type: "conditional",
      condition,
    });
  };

  const handlePresetSelect = (preset: (typeof CONDITION_PRESETS)[0]) => {
    handleConditionChange(preset.condition);
    setShowPresets(false);
    setShowConditionInput(true);
  };

  return (
    <div className="flex items-center justify-center py-2 relative z-50">
      <div className="flex items-center gap-2">
        {/* Connection line */}
        <div className="w-2 h-px bg-gray-600"></div>

        {/* Connection type selector */}
        <div className="relative z-50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex group items-center gap-2 px-2 py-1 bg-gray-800/90 border border-gray-600/50 rounded-md text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 transition-all text-xs backdrop-blur-sm"
          >
            {CurrentIcon && (
              <span
                className={`${currentConnection?.color || "text-gray-400"} ${currentConnection?.iconRotate || ""}`}
              >
                <CurrentIcon size={14} />
              </span>
            )}
            <span className="font-medium text-xs">
              {currentConnection?.label}
            </span>
            <ChevronUp
              size={10}
              className="text-gray-400 group-hover:text-lavender-400 rotate-90 group-hover:rotate-0 transition-all"
            />
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-2 min-w-48 w-max bg-gray-800/98 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              {CONNECTION_TYPES.map((type) => {
                const TypeIcon = type.Icon;
                const isSelected = currentType === type.type;
                return (
                  <button
                    key={type.type}
                    onClick={() =>
                      !type.disabled && handleTypeChange(type.type)
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
          )}
        </div>

        {/* Conditional logic input */}
        {currentType === "conditional" && (
          <div className="flex items-center gap-2 relative z-40">
            <div className="relative">
              <input
                type="text"
                value={connection?.condition || ""}
                onChange={(e) => handleConditionChange(e.target.value)}
                placeholder="Enter condition..."
                className="w-40 px-2 py-1 bg-gray-800/90 border border-gray-600/50 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 text-xs"
                onFocus={() => setShowConditionInput(true)}
                onBlur={() => {
                  // Delay hiding to allow preset clicks
                  setTimeout(() => setShowConditionInput(false), 150);
                }}
              />

              {showConditionInput && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800/98 border border-gray-600/50 rounded-lg shadow-xl z-[9999] p-2 backdrop-blur-xl">
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
                    {CONDITION_PRESETS.map((preset, index) => (
                      <button
                        key={index}
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
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-1 text-gray-400 hover:text-lavender-400 transition-colors hover:bg-gray-700/50 rounded"
              title="Show condition presets"
            >
              <Zap size={12} />
            </button>
          </div>
        )}

        {/* Connection line */}
        <div className="w-2 h-px bg-gray-600"></div>
      </div>
    </div>
  );
}
