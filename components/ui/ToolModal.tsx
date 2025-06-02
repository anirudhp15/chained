"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Settings,
  Globe,
  FileText,
  Monitor,
  Zap,
  Brain,
  Clock,
  ChevronRight,
  Check,
  type LucideIcon,
} from "lucide-react";

interface ToolOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  category?: string;
}

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

const GROK_TOOLS: ToolOption[] = [
  {
    id: "realTimeData",
    label: "Real-time Data",
    description: "Access to current information and live data feeds",
    icon: Globe,
    enabled: false,
    category: "Data Sources",
  },
  {
    id: "thinkingMode",
    label: "Thinking Mode",
    description: "Show reasoning process and step-by-step analysis",
    icon: Brain,
    enabled: false,
    category: "Reasoning",
  },
];

const CLAUDE_TOOL_SETS = [
  {
    id: "webSearch",
    label: "Web Search",
    description: "Search the internet for current information",
    icon: Globe,
    tools: ["Web Search API", "Real-time data access"],
  },
  {
    id: "fileAnalysis",
    label: "File Analysis",
    description: "Analyze and process uploaded files",
    icon: FileText,
    tools: ["Document parsing", "Code analysis", "Data extraction"],
  },
  {
    id: "computerUse",
    label: "Computer Use",
    description: "Interact with the computer interface",
    icon: Monitor,
    tools: ["Screenshots", "Click actions", "Keyboard input", "UI automation"],
  },
  {
    id: "full",
    label: "All Tools",
    description: "Access to complete toolkit",
    icon: Zap,
    tools: [
      "Web Search",
      "File Analysis",
      "Computer Use",
      "Advanced reasoning",
    ],
  },
] as const;

type ClaudeToolSet = (typeof CLAUDE_TOOL_SETS)[number]["id"];

export function ToolModal({
  isOpen,
  onClose,
  provider,
  grokOptions = {},
  claudeOptions = {},
  onGrokOptionsChange,
  onClaudeOptionsChange,
}: ToolModalProps) {
  const [selectedClaudeToolSet, setSelectedClaudeToolSet] =
    useState<ClaudeToolSet>(
      (claudeOptions.toolSet as ClaudeToolSet) || "webSearch"
    );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGrokToggle = (toolId: string) => {
    if (!onGrokOptionsChange) return;

    if (toolId === "realTimeData") {
      onGrokOptionsChange({
        ...grokOptions,
        realTimeData: !grokOptions.realTimeData,
      });
    } else if (toolId === "thinkingMode") {
      onGrokOptionsChange({
        ...grokOptions,
        thinkingMode: !grokOptions.thinkingMode,
      });
    }
  };

  const handleClaudeToolSetChange = (toolSet: string) => {
    const validToolSet = toolSet as ClaudeToolSet;
    setSelectedClaudeToolSet(validToolSet);
    if (onClaudeOptionsChange) {
      onClaudeOptionsChange({
        ...claudeOptions,
        enableTools: true,
        toolSet: validToolSet,
      });
    }
  };

  const handleClaudeToggle = () => {
    if (!onClaudeOptionsChange) return;

    const newEnabledState = !claudeOptions.enableTools;
    onClaudeOptionsChange({
      ...claudeOptions,
      enableTools: newEnabledState,
      toolSet: newEnabledState ? (selectedClaudeToolSet as any) : undefined,
    });
  };

  const renderGrokTools = () => (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-3">
        Enhance Grok with specialized capabilities
      </div>

      {GROK_TOOLS.map((tool) => {
        const isEnabled =
          tool.id === "realTimeData"
            ? grokOptions.realTimeData
            : grokOptions.thinkingMode;

        return (
          <div
            key={tool.id}
            className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              isEnabled
                ? "border-lavender-400/50 bg-lavender-500/10"
                : "border-gray-600/50 bg-gray-800/30 hover:border-gray-500/70 hover:bg-gray-800/50"
            }`}
            onClick={() => handleGrokToggle(tool.id)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isEnabled
                    ? "bg-lavender-500/20"
                    : "bg-gray-700/50 group-hover:bg-gray-700/70"
                }`}
              >
                <tool.icon
                  size={20}
                  className={`transition-colors ${
                    isEnabled
                      ? "text-lavender-400"
                      : "text-gray-400 group-hover:text-gray-300"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-medium transition-colors ${
                      isEnabled
                        ? "text-lavender-400"
                        : "text-white group-hover:text-gray-200"
                    }`}
                  >
                    {tool.label}
                  </h3>

                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                      isEnabled
                        ? "border-lavender-400 bg-lavender-500"
                        : "border-gray-500 group-hover:border-gray-400"
                    } flex items-center justify-center`}
                  >
                    {isEnabled && <Check size={12} className="text-white" />}
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderClaudeTools = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          Enable Claude's advanced tool capabilities
        </div>

        <button
          onClick={handleClaudeToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            claudeOptions.enableTools
              ? "bg-lavender-500/20 text-lavender-400 border border-lavender-400/30"
              : "bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70 hover:text-gray-300"
          }`}
        >
          {claudeOptions.enableTools ? "Enabled" : "Enable Tools"}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ${
          claudeOptions.enableTools
            ? "opacity-100"
            : "opacity-50 pointer-events-none"
        }`}
      >
        <div className="grid gap-3">
          {CLAUDE_TOOL_SETS.map((toolSet) => {
            const isSelected = selectedClaudeToolSet === toolSet.id;

            return (
              <div
                key={toolSet.id}
                className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-lavender-400/50 bg-lavender-500/10"
                    : "border-gray-600/50 bg-gray-800/30 hover:border-gray-500/70 hover:bg-gray-800/50"
                }`}
                onClick={() => handleClaudeToolSetChange(toolSet.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-lavender-500/20"
                        : "bg-gray-700/50 group-hover:bg-gray-700/70"
                    }`}
                  >
                    <toolSet.icon
                      size={20}
                      className={`transition-colors ${
                        isSelected
                          ? "text-lavender-400"
                          : "text-gray-400 group-hover:text-gray-300"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-medium transition-colors ${
                          isSelected
                            ? "text-lavender-400"
                            : "text-white group-hover:text-gray-200"
                        }`}
                      >
                        {toolSet.label}
                      </h3>

                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-lavender-400 bg-lavender-500"
                            : "border-gray-500 group-hover:border-gray-400"
                        } flex items-center justify-center`}
                      >
                        {isSelected && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                      {toolSet.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {toolSet.tools.map((tool, index) => (
                        <span
                          key={index}
                          className={`px-2 py-0.5 rounded text-xs transition-colors ${
                            isSelected
                              ? "bg-lavender-500/20 text-lavender-400"
                              : "bg-gray-700/50 text-gray-400"
                          }`}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg">
              <Settings size={20} className="text-lavender-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {provider === "xai"
                  ? "Grok"
                  : provider === "anthropic"
                    ? "Claude"
                    : "OpenAI"}{" "}
                Tools
              </h2>
              <p className="text-sm text-gray-400">
                Configure advanced capabilities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {provider === "xai" && renderGrokTools()}
          {provider === "anthropic" && renderClaudeTools()}
          {provider === "openai" && (
            <div className="text-center py-8 text-gray-400">
              <Monitor size={32} className="mx-auto mb-3 opacity-50" />
              <p>Advanced tools for OpenAI models coming soon...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Changes will apply to the current agent
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-lavender-500/20 hover:bg-lavender-500/30 border border-lavender-400/30 hover:border-lavender-400/50 rounded-lg text-lavender-400 text-sm font-medium transition-all duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
