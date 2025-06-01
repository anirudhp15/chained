"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Settings, Sparkles } from "lucide-react";
import { ToolModal } from "./ToolModal";

interface ToolButtonProps {
  provider: "xai" | "anthropic" | "openai";
  grokOptions?: {
    realTimeData?: boolean;
    thinkingMode?: boolean;
  };
  claudeOptions?: {
    enableTools?: boolean;
    toolSet?: "webSearch" | "fileAnalysis" | "computerUse" | "full";
  };
  onGrokOptionsChange?: (options: {
    realTimeData?: boolean;
    thinkingMode?: boolean;
  }) => void;
  onClaudeOptionsChange?: (options: {
    enableTools?: boolean;
    toolSet?: string;
  }) => void;
  className?: string;
}

export function ToolButton({
  provider,
  grokOptions = {},
  claudeOptions = {},
  onGrokOptionsChange,
  onClaudeOptionsChange,
  className = "",
}: ToolButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if any tools are enabled
  const hasActiveTools = () => {
    if (provider === "xai") {
      return !!(grokOptions.realTimeData || grokOptions.thinkingMode);
    }
    if (provider === "anthropic") {
      return !!claudeOptions.enableTools;
    }
    return false;
  };

  const getToolSummary = () => {
    if (provider === "xai") {
      const enabled = [];
      if (grokOptions.realTimeData) enabled.push("Real-time Data");
      if (grokOptions.thinkingMode) enabled.push("Thinking Mode");
      return enabled.length > 0 ? enabled.join(", ") : "No tools enabled";
    }

    if (provider === "anthropic") {
      if (!claudeOptions.enableTools) return "Tools disabled";
      const toolSetLabels = {
        webSearch: "Web Search",
        fileAnalysis: "File Analysis",
        computerUse: "Computer Use",
        full: "All Tools",
      };
      return toolSetLabels[claudeOptions.toolSet || "webSearch"];
    }

    return "Tools not available";
  };

  const getProviderName = () => {
    switch (provider) {
      case "xai":
        return "Grok";
      case "anthropic":
        return "Claude";
      case "openai":
        return "OpenAI";
      default:
        return "";
    }
  };

  const handleClick = () => {
    setIsModalOpen(true);
    setIsTooltipVisible(false);
  };

  const handleMouseEnter = () => {
    // Only show tools for providers that support them
    if (provider !== "openai" && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2,
      });
      setIsTooltipVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  // Don't render for OpenAI (no tools yet)
  if (provider === "openai") {
    return null;
  }

  const isActive = hasActiveTools();

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`group relative p-1.5 md:p-2 rounded-lg transition-all duration-200 ${
            isActive
              ? "bg-lavender-500/20 text-lavender-400 border border-lavender-400/30 hover:bg-lavender-500/30 hover:border-lavender-400/50"
              : "bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70 hover:text-gray-300 hover:border-gray-500/70"
          } ${className}`}
          title={`${getProviderName()} Tools`}
        >
          <div className="relative">
            <Settings
              size={14}
              className={`md:w-4 md:h-4 transition-transform group-hover:rotate-45 ${
                isActive
                  ? "text-lavender-400"
                  : "text-gray-400 group-hover:text-gray-300"
              }`}
            />

            {/* Active indicator */}
            {isActive && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-lavender-500 rounded-full border border-gray-800">
                <div className="w-full h-full bg-lavender-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Hover Tooltip - Rendered via Portal */}
      {isTooltipVisible &&
        createPortal(
          <div
            className="fixed z-[99999] pointer-events-none"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-xl p-3 min-w-48 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={14} className="text-lavender-400" />
                <span className="text-sm font-medium text-white">
                  {getProviderName()} Tools
                </span>
              </div>

              <div className="text-xs text-gray-400 mb-2">
                {getToolSummary()}
              </div>

              <div className="flex items-center gap-1 text-xs text-lavender-400">
                <Sparkles size={10} />
                <span>Click to configure</span>
              </div>

              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-gray-900/95 border-r border-b border-gray-600/50 rotate-45" />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Tool Modal */}
      <ToolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        provider={provider}
        grokOptions={grokOptions}
        claudeOptions={claudeOptions}
        onGrokOptionsChange={onGrokOptionsChange}
        onClaudeOptionsChange={onClaudeOptionsChange}
      />
    </>
  );
}
