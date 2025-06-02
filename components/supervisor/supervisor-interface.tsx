"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { ChainProgress } from "../performance/chain-progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Maximize2,
  Minimize2,
  X,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  BarChart3,
  Paperclip,
} from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";
import { usePerformance } from "@/lib/performance-context";
import { UploadedImage } from "../modality/ImageUpload";
import { ModalityIcons } from "../modality/ModalityIcons";

interface SupervisorInterfaceProps {
  sessionId: Id<"chatSessions">;
  agentSteps: any[];
  onSupervisorSend: (prompt: string) => void;
  onSupervisorTyping?: (isTyping: boolean) => void;
  isLoading?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTyping: boolean;
  supervisorStatus: "idle" | "thinking" | "orchestrating" | "ready";
  supervisorStreamContent?: { [turnId: string]: string };
}

interface AgentOption {
  index: number;
  name: string;
  model: string;
}

export function SupervisorInterface({
  sessionId,
  agentSteps,
  onSupervisorSend,
  onSupervisorTyping,
  isLoading = false,
  isOpen,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
  isTyping,
  supervisorStatus,
  supervisorStreamContent = {},
}: SupervisorInterfaceProps) {
  // Chat input state
  const [prompt, setPrompt] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  const [filteredAgents, setFilteredAgents] = useState<AgentOption[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

  // Get performance state for performance toggle
  const { showDetailedPerformance, togglePerformance } = usePerformance();

  // Modal data
  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
    sessionId,
  });

  // Available agents for @mention autocomplete
  const availableAgents: AgentOption[] = agentSteps.map((step, index) => ({
    index,
    name: step.name || `Agent ${index + 1}`,
    model: step.model,
  }));

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

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        onToggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  // Input handling functions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);

    // Trigger typing indicator
    if (onSupervisorTyping) {
      onSupervisorTyping(true);
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onSupervisorTyping(false);
      }, 1000);
    }

    // Handle @mention autocomplete
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && atIndex > lastAtPosition) {
      const searchText = textBeforeCursor.substring(atIndex + 1).toLowerCase();
      const filtered = availableAgents.filter((agent) =>
        agent.name.toLowerCase().includes(searchText)
      );
      setFilteredAgents(filtered);
      setShowAgentDropdown(filtered.length > 0);
      setLastAtPosition(atIndex);
    } else if (atIndex === -1 || atIndex < lastAtPosition) {
      setShowAgentDropdown(false);
      setLastAtPosition(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAgentDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      // Handle dropdown navigation if needed
    } else if (showAgentDropdown && e.key === "Escape") {
      setShowAgentDropdown(false);
    }
  };

  const handleAgentSelect = (agent: AgentOption) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = prompt.substring(0, cursorPosition);
    const textAfterCursor = prompt.substring(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const newText =
        textBeforeCursor.substring(0, atIndex) +
        `@${agent.name} ` +
        textAfterCursor;
      setPrompt(newText);

      // Set cursor position after the inserted text
      setTimeout(() => {
        const newCursorPosition = atIndex + agent.name.length + 2;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
      }, 0);
    }

    setShowAgentDropdown(false);
    setLastAtPosition(-1);
  };

  const handleSend = () => {
    if (prompt.trim() && !isLoading) {
      // Stop typing indicator when sending
      if (onSupervisorTyping) {
        onSupervisorTyping(false);
      }

      onSupervisorSend(prompt.trim());
      setPrompt("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showAgentDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getStatusText = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "Supervisor thinking...";
      case "orchestrating":
        return "Orchestrating agents...";
      case "ready":
        return "Ready";
      default:
        return "Supervisor available";
    }
  };

  const getStatusColor = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "text-yellow-400";
      case "orchestrating":
        return "text-blue-400";
      case "ready":
        return "text-emerald-400";
      default:
        return "text-gray-400";
    }
  };

  // If fullscreen, render the fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-30 bg-gray-950/95 backdrop-blur-sm">
        <div className="h-full flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex-shrink-0 px-6 py-4 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm text-lavender-400 font-medium">
                  Supervisor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleFullscreen}
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                  title="Exit fullscreen"
                >
                  <Minimize2 className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Fullscreen Content */}
          <div className="flex-1 overflow-y-auto">
            <SupervisorConversationContent
              supervisorTurns={supervisorTurns}
              supervisorStreamContent={supervisorStreamContent}
              agentSteps={agentSteps}
            />
          </div>
        </div>
      </div>
    );
  }

  // Regular integrated interface
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pb-4 px-2 md:px-0 md:pb-6"
      style={{
        paddingBottom:
          typeof window !== "undefined" && window.innerWidth >= 768
            ? "max(1rem, env(safe-area-inset-bottom))"
            : "8px",
        ...getContainerStyle(),
      }}
    >
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl mx-auto">
          <div className="space-y-2">
            {/* Supervisor Modal - positioned above input */}
            {isOpen && (
              <div className="w-full bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-xl shadow-2xl shadow-gray-950/50 overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-xs text-lavender-400 font-medium">
                      Supervisor
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${getStatusColor()}`}>
                      {getStatusText()}
                    </span>
                    <button
                      onClick={onToggleFullscreen}
                      className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                      title="Expand to fullscreen"
                    >
                      <Maximize2 className="w-3 h-3 text-gray-400 hover:text-white" />
                    </button>
                    <button
                      onClick={onToggle}
                      className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                      title="Collapse"
                    >
                      <ChevronDown className="w-3 h-3 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>

                {/* Modal Content with internal scrolling */}
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-dark">
                  <SupervisorConversationContent
                    supervisorTurns={supervisorTurns}
                    supervisorStreamContent={supervisorStreamContent}
                    agentSteps={agentSteps}
                  />
                </div>
              </div>
            )}

            {/* Status indicator when modal is closed */}
            {!isOpen && (
              <div className="flex justify-center">
                <button
                  onClick={onToggle}
                  className="flex justify-between shadow-lg shadow-gray-950/50 items-center gap-3 px-4 py-3 bg-gray-900/85 backdrop-blur-sm border max-w-4xl w-full border-gray-600/50 rounded-xl text-sm transition-all duration-300 hover:bg-gray-800/90 hover:border-emerald-400/30 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-xs text-lavender-400 font-medium">
                      Supervisor
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${getStatusColor()}`}>
                      {getStatusText()}
                    </span>
                    <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>
              </div>
            )}

            {/* Supervisor Chat Input */}
            <div className="relative w-full bg-gray-800/70 backdrop-blur-md border hover:bg-gray-700/80 border-gray-600/50 rounded-xl">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyPress={handleKeyPress}
                placeholder="What do you want to do next?"
                className="w-full h-24 md:h-32 lg:h-44 px-3 md:px-4 py-3 md:py-4 pb-12 md:pb-16 border-none outline-none ring-0 text-base md:text-sm bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none transition-all"
                style={{ fontSize: "16px" }}
              />

              {/* @mention autocomplete dropdown */}
              {showAgentDropdown && filteredAgents.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full left-0 mb-2 w-full md:w-min bg-gray-900/90 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  {filteredAgents.map((agent) => (
                    <button
                      key={agent.index}
                      onClick={() => handleAgentSelect(agent)}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-xs text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-white whitespace-nowrap font-medium">
                          {agent.name}
                        </span>
                        <span className="text-gray-400 whitespace-nowrap text-xs">
                          {agent.model}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 md:p-4">
                <div className="flex items-center gap-2">
                  {/* Image attachment and modality icons */}
                  <ModalityIcons
                    selectedModel="gpt-4o" // Default to a model that supports images
                    onImagesChange={setImages}
                    onWebSearchToggle={() => {}} // Supervisor doesn't need web search toggle
                    isWebSearchEnabled={false}
                    images={images}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Performance toggle button */}
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

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!prompt.trim() || isLoading}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      prompt.trim() && !isLoading
                        ? "bg-lavender-500 hover:bg-lavender-600 text-white shadow-lg hover:shadow-lavender-500/25 hover:scale-105"
                        : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden md:inline">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span className="hidden md:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted conversation content component for reuse
function SupervisorConversationContent({
  supervisorTurns,
  supervisorStreamContent = {},
  agentSteps,
}: {
  supervisorTurns: any[] | undefined;
  supervisorStreamContent?: { [turnId: string]: string };
  agentSteps?: any[] | undefined;
}) {
  // Show chain progress when there are no supervisor turns but there are agent steps
  if (
    (!supervisorTurns || supervisorTurns.length === 0) &&
    agentSteps &&
    agentSteps.length > 0
  ) {
    return (
      <div className="px-8 py-8">
        <ChainProgress agentSteps={agentSteps} />
      </div>
    );
  }

  // Show welcome message when there are no supervisor turns and no agent steps
  if (!supervisorTurns || supervisorTurns.length === 0)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <h3 className="text-xl font-normal text-gray-200 mb-6">Supervisor</h3>
          <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
            Coordinate your agents by mentioning them in your messages.
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>"@Agent1 analyze this data"</p>
            <p>"@Agent2 summarize the findings"</p>
            <p>"@Agent1 @Agent2 collaborate"</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="px-8 py-8 space-y-12">
      {supervisorTurns.map((turn, index) => (
        <div key={turn._id} className="space-y-8">
          {/* User Message */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xs font-medium text-white">U</span>
            </div>
            <div className="flex-1 pt-1">
              <div className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                {turn.userInput}
              </div>
            </div>
          </div>

          {/* Supervisor Response */}
          {(turn.supervisorResponse ||
            turn.isStreaming ||
            supervisorStreamContent[turn._id]) && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-medium text-white">S</span>
              </div>
              <div className="flex-1 pt-1">
                <div className="text-gray-200 text-base leading-relaxed">
                  {turn.isStreaming && supervisorStreamContent[turn._id] ? (
                    <div>
                      <MarkdownRenderer
                        content={supervisorStreamContent[turn._id] || ""}
                      />
                      <div className="inline-block w-0.5 h-5 bg-emerald-400 ml-1 animate-pulse"></div>
                    </div>
                  ) : turn.isStreaming && !turn.supervisorResponse ? (
                    <div className="flex items-center gap-3 text-gray-400">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <span>Supervisor thinking...</span>
                    </div>
                  ) : (
                    <MarkdownRenderer content={turn.supervisorResponse || ""} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Agent Executions */}
          {turn.parsedMentions && turn.parsedMentions.length > 0 && (
            <div className="ml-12 space-y-6">
              {turn.parsedMentions.map((mention: any, mentionIndex: number) => {
                // Find the corresponding agent step
                const agentStep = agentSteps?.find(
                  (step) => step.index === mention.agentIndex
                );

                return (
                  <div key={mentionIndex} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-xs font-medium text-white">A</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="mb-2">
                        <span className="text-gray-300 font-medium">
                          {mention.agentName}
                        </span>
                        <span className="ml-3 text-sm text-gray-400">
                          {agentStep
                            ? agentStep.isStreaming
                              ? "Working..."
                              : agentStep.isComplete && !agentStep.error
                                ? "Complete"
                                : agentStep.error
                                  ? "Error"
                                  : "Pending"
                            : "Queued"}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400 mb-3">
                        {mention.taskPrompt}
                      </div>

                      {agentStep &&
                        (agentStep.response ||
                          agentStep.streamedContent ||
                          agentStep.error ||
                          agentStep.isStreaming) && (
                          <div className="text-gray-200 text-base leading-relaxed">
                            {agentStep.error ? (
                              <div className="text-red-400">
                                Error: {agentStep.error}
                              </div>
                            ) : agentStep.response ? (
                              <div>
                                {agentStep.response.length > 200
                                  ? `${agentStep.response.slice(0, 200)}...`
                                  : agentStep.response}
                              </div>
                            ) : agentStep.streamedContent ? (
                              <div>
                                {agentStep.streamedContent.length > 200
                                  ? `${agentStep.streamedContent.slice(0, 200)}...`
                                  : agentStep.streamedContent}
                              </div>
                            ) : agentStep.isStreaming ? (
                              <div className="flex items-center gap-3 text-gray-400">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <span>Processing...</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
