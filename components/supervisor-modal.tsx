"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { MarkdownRenderer } from "./markdown-renderer";
import { ChainProgress } from "./chain-progress";
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
} from "lucide-react";

interface SupervisorModalProps {
  sessionId: Id<"chatSessions">;
  isOpen: boolean;
  onToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTyping: boolean;
  supervisorStatus: "idle" | "thinking" | "orchestrating" | "ready";
  supervisorStreamContent?: { [turnId: string]: string };
}

const MODAL_BOTTOM_OFFSET = "bottom-[110px] md:bottom-[150px]";

export function SupervisorModal({
  sessionId,
  isOpen,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
  isTyping,
  supervisorStatus,
  supervisorStreamContent = {},
}: SupervisorModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
    sessionId,
  });

  const agentSteps = useQuery(api.queries.getAgentSteps, {
    sessionId,
  });

  // Handle modal opening/closing animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(true);
      // Reset animation state after transition
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Hide modal immediately when closing (no transition)
      setShouldRender(false);
    }
  }, [isOpen]);

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

  const getStatusText = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "Supervisor thinking...";
      case "orchestrating":
        return "Orchestrating agents...";
      case "ready":
        return "Ready for actions";
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

  // Status indicator when modal is closed
  if (!isOpen && !isFullscreen) {
    return (
      <div
        className={`absolute ${MODAL_BOTTOM_OFFSET} left-0 right-0 flex justify-center pb-4 px-6 z-30 `}
      >
        <button
          onClick={onToggle}
          className="flex justify-between shadow-lg shadow-gray-950/50 items-center gap-3 px-4 py-2 bg-gray-900/75 backdrop-blur-sm border max-w-sm hover:max-w-4xl w-full border-gray-600/50 rounded-xl text-sm transition-all duration-200 hover:bg-gray-800/90 hover:border-emerald-400/20 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
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
    );
  }

  // Fullscreen mode
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

  // Modal overlay mode with smooth transitions
  return (
    <div
      className={`absolute ${MODAL_BOTTOM_OFFSET} left-0 right-0 flex justify-center pb-4 px-6 z-30 pointer-events-none`}
    >
      {shouldRender && (
        <div
          className={`w-full max-w-4xl bg-gray-900/90 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl pointer-events-auto ${
            isAnimating ? "supervisor-modal-opening" : "supervisor-modal-enter"
          }`}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50">
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

          {/* Modal Content */}
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-dark">
            <SupervisorConversationContent
              supervisorTurns={supervisorTurns}
              supervisorStreamContent={supervisorStreamContent}
              agentSteps={agentSteps}
            />
          </div>
        </div>
      )}
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
      <div className="px-4 py-6">
        <ChainProgress agentSteps={agentSteps} />
      </div>
    );
  }

  // Show welcome message when there are no supervisor turns and no agent steps
  if (!supervisorTurns || supervisorTurns.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Supervisor Ready
          </h3>
          <p className="text-gray-400 mb-3 text-sm">
            Coordinate your agents by mentioning them in your messages.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• "@Agent1 analyze this data"</p>
            <p>• "@Agent2 summarize the findings"</p>
            <p>• "@Agent1 @Agent2 collaborate on this task"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {supervisorTurns.map((turn) => (
        <div key={turn._id} className="space-y-3">
          {/* User Input */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-white text-sm whitespace-pre-wrap">
                  {turn.userInput}
                </p>
              </div>
            </div>
          </div>

          {/* Supervisor Response */}
          {(turn.supervisorResponse ||
            turn.isStreaming ||
            supervisorStreamContent[turn._id]) && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/30">
                  {turn.isStreaming && supervisorStreamContent[turn._id] ? (
                    // Show live streaming content
                    <div className="text-sm">
                      <MarkdownRenderer
                        content={supervisorStreamContent[turn._id] || ""}
                      />
                      <div className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse"></div>
                    </div>
                  ) : turn.isStreaming && !turn.supervisorResponse ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-400"></div>
                      <span className="text-xs">Supervisor thinking...</span>
                    </div>
                  ) : (
                    // Show final response
                    <div className="text-sm">
                      <MarkdownRenderer
                        content={turn.supervisorResponse || ""}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Agent coordination indicator - simplified without exposing internal prompts */}
          {turn.parsedMentions && turn.parsedMentions.length > 0 && (
            <div className="ml-9 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Zap className="w-3 h-3" />
                <span>Agent Executions:</span>
              </div>

              {turn.parsedMentions.map((mention: any, index: number) => {
                // Find the corresponding agent step
                const agentStep = agentSteps?.find(
                  (step) => step.index === mention.agentIndex
                );

                return (
                  <div
                    key={index}
                    className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="px-2 py-0.5 bg-emerald-900/20 rounded text-xs text-emerald-300 border border-emerald-700/50">
                        @{mention.agentName}
                      </div>
                      {agentStep && (
                        <>
                          {agentStep.isStreaming ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-400"></div>
                              <span className="text-xs text-blue-400">
                                Working
                              </span>
                            </div>
                          ) : agentStep.isComplete && !agentStep.error ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : agentStep.error ? (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-yellow-400" />
                          )}
                        </>
                      )}
                    </div>

                    {/* Task description */}
                    <div className="text-xs text-gray-400 mb-1">
                      Task: {mention.taskPrompt}
                    </div>

                    {/* Agent response preview */}
                    {agentStep &&
                      (agentStep.error ? (
                        <div className="text-xs text-red-400">
                          Error: {agentStep.error}
                        </div>
                      ) : agentStep.response ? (
                        <div className="text-xs text-gray-300 line-clamp-2">
                          {agentStep.response.slice(0, 100)}
                          {agentStep.response.length > 100 && "..."}
                        </div>
                      ) : agentStep.streamedContent ? (
                        <div className="text-xs text-gray-300 line-clamp-2">
                          {agentStep.streamedContent.slice(0, 100)}
                          {agentStep.streamedContent.length > 100 && "..."}
                        </div>
                      ) : agentStep.isStreaming ? (
                        <div className="text-xs text-gray-400">
                          Processing supervisor task...
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Waiting to execute...
                        </div>
                      ))}
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
