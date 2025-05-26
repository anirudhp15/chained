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
    description: "Run only if condition is met",
    color: "text-amber-400",
    iconRotate: "rotate-90",
  },
  {
    type: "parallel" as const,
    label: "Parallel",
    Icon: GitFork,
    description: "Run simultaneously (coming soon)",
    color: "text-purple-400",
    disabled: true,
    iconRotate: "rotate-90",
  },
  {
    type: "collaborative" as const,
    label: "Collaborative",
    Icon: GitCompareArrows,
    description: "Work together (coming soon)",
    color: "text-gray-400",
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
}: ConnectionBadgeProps) {
  const connection = CONNECTION_TYPES.find((t) => t.type === type);
  const IconComponent = connection?.Icon;
  const iconSize = size === "sm" ? 14 : 16;
  const iconRotate = connection?.iconRotate || "";

  const getTypeColor = () => {
    switch (type) {
      case "direct":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "conditional":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "parallel":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    }
  };

  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const paddingSize = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`flex items-center gap-1.5 ${paddingSize} rounded-md border ${getTypeColor()} ${textSize} font-medium`}
      >
        {IconComponent && (
          <span className={`flex items-center ${iconRotate}`}>
            <IconComponent size={iconSize} />
          </span>
        )}

        <span className="text-gray-300">Chained from</span>
        <span className="font-semibold">Agent {sourceAgentIndex! + 1}</span>

        {type === "conditional" && condition && (
          <>
            <span className="text-gray-300">if</span>
            <code className="bg-black/20 px-1.5 py-0.5 rounded text-xs font-mono">
              {condition}
            </code>
          </>
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
