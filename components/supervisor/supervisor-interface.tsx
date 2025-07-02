"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { MessageBubble } from "../chat/message-bubble";
import { SupervisorConversationContent } from "./supervisor-conversation-content";
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
  Link2,
  Unlink,
  ArrowUp,
  LoaderCircle,
  Link,
} from "lucide-react";
import { SiOpenai, SiClaude } from "react-icons/si";
import { useSidebar } from "@/lib/sidebar-context";
import { usePerformance } from "@/lib/performance-context";
import { UploadedImage } from "../modality/ImageUpload";
import { ModalityIcons } from "../modality/ModalityIcons";
import { CopyButton } from "../ui/CopyButton";
import { ReferenceStack } from "../ui/ReferenceStack";
import { ReferencesModal } from "../ui/references-modal";
import { useCopyTracking } from "../../lib/copy-tracking-context";
import type { CopyReference } from "../../lib/copy-tracking-context";
import { CopyReference as CopyReferenceComponent } from "../ui/CopyReference";
import { extractCleanTaskPrompt } from "../../lib/supervisor-parser";

// Grok Icon Component
const GrokIcon = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 24 24"
    className={className}
  >
    <path d="m19.25 5.08-9.52 9.67 6.64-4.96c.33-.24.79-.15.95.23.82 1.99.45 4.39-1.17 6.03-1.63 1.64-3.89 2.01-5.96 1.18l-2.26 1.06c3.24 2.24 7.18 1.69 9.64-.8 1.95-1.97 2.56-4.66 1.99-7.09-.82-3.56.2-4.98 2.29-7.89L22 2.3zM9.72 14.75h.01zM8.35 15.96c-2.33-2.25-1.92-5.72.06-7.73 1.47-1.48 3.87-2.09 5.97-1.2l2.25-1.05c-.41-.3-.93-.62-1.52-.84a7.45 7.45 0 0 0-8.13 1.65c-2.11 2.14-2.78 5.42-1.63 8.22.85 2.09-.54 3.57-1.95 5.07-.5.53-1 1.06-1.4 1.62z" />
  </svg>
);

// Helper function to get model provider icon
function getModelProviderIcon(model: string) {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("claude")) {
    return {
      Icon: SiClaude,
      color: "text-[#da7756]",
      bgColor: "bg-[#000000]",
    };
  } else if (modelLower.includes("grok") || modelLower.includes("xai")) {
    return {
      Icon: GrokIcon,
      color: "text-white",
      bgColor: "bg-[#000000]",
    };
  } else {
    // Default to OpenAI
    return {
      Icon: SiOpenai,
      color: "text-white",
      bgColor: "bg-[#000000]",
    };
  }
}

// Collapsible Agent Execution Component
export function CollapsibleAgentExecution({
  mention,
  agentStep,
  onFocus,
}: {
  mention: any;
  agentStep: any;
  onFocus?: (agentIndex: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const modelProvider = getModelProviderIcon(agentStep?.model || "");

  const getStatusText = () => {
    if (!agentStep) return "Queued";
    if (agentStep.isStreaming) return "Working...";
    if (agentStep.isComplete && !agentStep.error) return "Complete";
    if (agentStep.error) return "Error";
    return "Pending";
  };

  const getStatusColor = () => {
    if (!agentStep) return "text-gray-400";
    if (agentStep.isStreaming) return "text-blue-400";
    if (agentStep.isComplete && !agentStep.error) return "text-emerald-400";
    if (agentStep.error) return "text-red-400";
    return "text-gray-400";
  };

  // Always prioritize original chain data - never show supervisor-contaminated content
  const hasContent =
    agentStep &&
    (agentStep.response ||
      agentStep.streamedContent ||
      agentStep.error ||
      agentStep.isStreaming);

  return (
    <div className="border border-gray-600/75 rounded-lg text-xs overflow-hidden bg-gray-800/70">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-2 py-1 transition-colors"
      >
        <div
          className={`w-6 h-6 ${modelProvider.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <modelProvider.Icon size={12} className={modelProvider.color} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <span className="text-gray-300 font-medium truncate block">
            {mention.agentName}
          </span>
        </div>

        <span className={`${getStatusColor()}`}>{getStatusText()}</span>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-gray-600/75">
              {/* Task Prompt with References */}
              <div className="pt-3">
                {(() => {
                  // Extract clean prompt and parse embedded references
                  const cleanPrompt = extractCleanTaskPrompt(
                    mention.taskPrompt
                  );

                  // Parse embedded references if any
                  const embeddedReferences: any[] = [];
                  const referencePattern =
                    /--- References ---\s*(\[Reference \d+\][\s\S]*?)(?=\[Reference \d+\]|$)/g;

                  let match;
                  while (
                    (match = referencePattern.exec(mention.taskPrompt)) !== null
                  ) {
                    const referenceText = match[1];
                    const sourceMatch = referenceText.match(
                      /From (\w+) \(([^)]+)\):/
                    );

                    if (sourceMatch) {
                      const sourceType = sourceMatch[2];
                      const sourceName = sourceMatch[1];

                      // Extract content after the source line
                      const contentMatch = referenceText.match(
                        /From[^:]+:\s*([\s\S]+)/
                      );
                      const content = contentMatch
                        ? contentMatch[1].trim()
                        : referenceText;

                      embeddedReferences.push({
                        id: `supervisor-modal-embedded-${Date.now()}-${embeddedReferences.length}`,
                        sourceType: sourceType.includes("code")
                          ? "code-block"
                          : sourceType.includes("response")
                            ? "agent-response"
                            : "user-prompt",
                        agentName: sourceName,
                        content: content,
                        truncatedPreview:
                          content.substring(0, 100) +
                          (content.length > 100 ? "..." : ""),
                        timestamp: Date.now(),
                      });
                    }
                  }

                  return (
                    <>
                      {/* Clean Task Prompt */}
                      <div className="text-sm text-gray-400 leading-relaxed mb-2">
                        {cleanPrompt}
                      </div>

                      {/* Display reference chips if any */}
                      {embeddedReferences.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-600/30">
                          {embeddedReferences.map((ref, index) => (
                            <CopyReferenceComponent
                              key={ref.id}
                              reference={ref}
                              onRemove={undefined} // No remove functionality in supervisor modal
                              isCompact={true}
                              showPreview={false}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Original Chain Response - isolated from supervisor interactions */}
              {hasContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="text-gray-200 text-sm leading-relaxed"
                >
                  {agentStep.error ? (
                    <div className="text-red-400 p-2 bg-red-500/10 rounded border border-red-500/20">
                      Error: {agentStep.error}
                    </div>
                  ) : agentStep.response || agentStep.streamedContent ? (
                    <div className="group/response">
                      <div
                        className="p-2 bg-gray-800/50 rounded max-w-2xl mx-auto"
                        data-response-content="true"
                        data-source-type="agent-response"
                      >
                        <MarkdownRenderer
                          content={
                            agentStep.response ||
                            agentStep.streamedContent ||
                            ""
                          }
                          isStreaming={agentStep.isStreaming}
                          className="break-words overflow-wrap-anywhere"
                          agentIndex={agentStep.index}
                          agentName={mention.agentName}
                          agentModel={agentStep.model}
                          sessionId={agentStep.sessionId}
                        />
                      </div>
                      {/* Action Buttons with Source Context */}
                      {!agentStep.isStreaming &&
                        (agentStep.response || agentStep.streamedContent) && (
                          <div className="flex justify-between items-center mt-2 opacity-0 group-hover/response:opacity-100 transition-opacity duration-200">
                            {/* Focus Button */}
                            <button
                              onClick={() => onFocus?.(mention.agentIndex)}
                              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-lavender-400 hover:bg-gray-700/50 rounded-md transition-colors"
                              title="Focus on this agent"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="3"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                <path
                                  d="M12 1v6m0 8v6m11-7h-6m-8 0H1"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                              Focus
                            </button>

                            {/* Copy Button */}
                            <CopyButton
                              text={
                                agentStep.response ||
                                agentStep.streamedContent ||
                                ""
                              }
                              size="sm"
                              sourceContext={{
                                sourceType: "agent-response",
                                agentIndex: agentStep.index,
                                agentName: mention.agentName,
                                agentModel: agentStep.model,
                                sessionId: agentStep.sessionId,
                              }}
                            />
                          </div>
                        )}
                    </div>
                  ) : agentStep.isStreaming ? (
                    <div className="flex items-center gap-3 text-gray-400 p-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Processing...</span>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SupervisorInterfaceProps {
  sessionId: Id<"chatSessions">;
  agentSteps: any[];
  onSupervisorSend: (prompt: string) => void;
  onSupervisorTyping?: (isTyping: boolean) => void;
  onFocusAgent?: (agentIndex: number) => void;
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
  onFocusAgent,
  isLoading = false,
  isOpen,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
  isTyping,
  supervisorStatus,
  supervisorStreamContent = {},
}: SupervisorInterfaceProps) {
  // Enhanced modal state for professional resize functionality
  const [isMaximized, setIsMaximized] = useState(false);
  const [modalHeight, setModalHeight] = useState(() => {
    // Restore user's preferred height from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supervisor-modal-height");
      return saved ? parseInt(saved) : 320;
    }
    return 320;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  // Chat input state
  const [prompt, setPrompt] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  const [filteredAgents, setFilteredAgents] = useState<AgentOption[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hover state for better UX
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic text state for supervisor label
  const [hoverContext, setHoverContext] = useState<string>("supervisor");

  // Helper function to get display text based on hover context
  const getDisplayText = () => {
    switch (hoverContext) {
      case "metrics":
        return "Show metrics";
      case "attach":
        return "Attach file";
      case "expand":
        return isOpen ? "Close" : "Expand";
      case "send":
        return "Send";
      default:
        return "Supervisor";
    }
  };

  // Hover handlers for dynamic text
  const handleHoverContext = (context: string) => {
    setHoverContext(context);
  };

  const handleHoverContextReset = () => {
    setHoverContext("supervisor");
  };

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

  // Get performance state for performance toggle
  const { showDetailedPerformance, togglePerformance } = usePerformance();

  // Copy reference state management
  const [showReferencesModal, setShowReferencesModal] = useState(false);
  const {
    references,
    removeReference,
    clearAllReferences,
    getTrackedCopy,
    addReference,
    setSession,
  } = useCopyTracking();

  // Set current session for copy tracking
  useEffect(() => {
    setSession(sessionId);
  }, [sessionId, setSession]);

  // Modal data
  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
    sessionId,
  });

  // Available agents for @mention autocomplete
  const availableAgents: AgentOption[] = agentSteps.map((step, index) => ({
    index,
    name: step.name || `LLM ${index + 1}`,
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

  // Enhanced keyboard shortcuts for modal control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when supervisor modal is open
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (isMaximized) {
          setIsMaximized(false);
        } else if (isDragging) {
          setIsDragging(false);
        }
      }

      // Ctrl/Cmd + M to toggle maximize (when modal is focused)
      if ((e.metaKey || e.ctrlKey) && e.key === "m" && isOpen) {
        e.preventDefault();
        handleMaximizeToggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized, isOpen, isDragging]);

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

      // Prepare structured data for API
      const cleanUserInput = prompt.trim();
      const referencesData = references.map((ref) => ({
        id: ref.id,
        sourceType: ref.sourceType,
        agentIndex: ref.agentIndex,
        agentName: ref.agentName,
        agentModel: ref.agentModel,
        content: ref.content,
        truncatedPreview: ref.truncatedPreview,
        timestamp: ref.timestamp,
        sessionId: ref.sessionId,
      }));

      // Construct full context message for AI (keeping existing logic for AI)
      let fullContextMessage = cleanUserInput;
      if (references.length > 0) {
        const referencesContext = references
          .map((ref, index) => {
            const sourceLabel =
              ref.agentName || `Node ${(ref.agentIndex ?? 0) + 1}`;
            return `[Reference ${index + 1}] From ${sourceLabel} (${ref.sourceType}): ${ref.content}`;
          })
          .join("\n\n");

        fullContextMessage = `${cleanUserInput}\n\n--- References ---\n${referencesContext}`;
      }

      // Send structured data to API
      onSupervisorSend(
        JSON.stringify({
          userInput: cleanUserInput,
          references: referencesData,
          fullContext: fullContextMessage, // For AI processing
        })
      );

      // Clear prompt and references after sending
      setPrompt("");
      clearAllReferences();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showAgentDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  // Paste handler for reference interception
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");

      if (!pastedText.trim()) return;

      // Check if pasted content matches tracked copies
      const trackedCopy = getTrackedCopy(pastedText);

      if (trackedCopy) {
        e.preventDefault();

        // Convert matching content to reference instead of raw text
        addReference(trackedCopy);

        // Maintain cursor position after reference creation
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPosition = textarea.selectionStart;
          setTimeout(() => {
            textarea.setSelectionRange(cursorPosition, cursorPosition);
            textarea.focus();
          }, 0);
        }
      }
      // If no match found, allow normal paste behavior
    },
    [getTrackedCopy, addReference]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse interactions for basic hover effects
  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const getStatusText = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "Supervising...";
      case "orchestrating":
        return "Orchestrating...";
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
        return "text-lavender-400";
      default:
        return "text-gray-400";
    }
  };

  // Enhanced resize and maximize functionality
  const handleMaximizeToggle = () => {
    if (isMaximized) {
      // When minimizing, restore to previous height or default
      setIsMaximized(false);
    } else {
      // When maximizing, go full screen
      setIsMaximized(true);
    }
  };

  // Drag resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized) return; // Don't allow resize when maximized

    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(modalHeight);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isDragging || isMaximized) return;

    e.preventDefault();
    const deltaY = dragStartY - e.clientY; // Inverted because we're dragging from top
    const minHeight =
      typeof window !== "undefined" && window.innerWidth < 768 ? 250 : 200; // Taller min on mobile
    const maxHeight =
      (typeof window !== "undefined" ? window.innerHeight : 800) - 120; // More space for mobile UI
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, dragStartHeight + deltaY)
    );
    setModalHeight(newHeight);
  };

  const handleResizeEnd = () => {
    setIsDragging(false);
    // Save user's preferred height to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("supervisor-modal-height", modalHeight.toString());
    }
  };

  // Touch resize for mobile
  const handleTouchResizeStart = (e: React.TouchEvent) => {
    if (isMaximized) return;

    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStartY(touch.clientY);
    setDragStartHeight(modalHeight);
  };

  const handleTouchResizeMove = (e: TouchEvent) => {
    if (!isDragging || isMaximized) return;

    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = dragStartY - touch.clientY;
    const minHeight =
      typeof window !== "undefined" && window.innerWidth < 768 ? 250 : 200; // Taller min on mobile
    const maxHeight =
      (typeof window !== "undefined" ? window.innerHeight : 800) - 120; // More space for mobile UI
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, dragStartHeight + deltaY)
    );
    setModalHeight(newHeight);
  };

  // Global mouse/touch event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleResizeMove(e);
      const handleMouseUp = () => handleResizeEnd();
      const handleTouchMove = (e: TouchEvent) => handleTouchResizeMove(e);
      const handleTouchEnd = () => handleResizeEnd();

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, dragStartY, dragStartHeight, modalHeight, isMaximized]);

  // Regular integrated interface
  return (
    <div
      ref={containerRef}
      className={`
        fixed left-0 right-0 z-50 
        transition-all duration-300 ease-in-out
        flex flex-col items-center justify-end
        ${isMaximized ? "top-0 bottom-0" : "bottom-0"}
      `}
      style={{
        paddingBottom:
          typeof window !== "undefined" &&
          window.innerWidth >= 768 &&
          !isMaximized
            ? "max(0.5rem, env(safe-area-inset-bottom))"
            : "0px",
        paddingTop: isMaximized ? "1rem" : "0",
        ...getContainerStyle(),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`
        w-full flex flex-col items-center justify-end
        transition-all duration-300 ease-in-out h-full
        md:max-w-4xl
        ${isMaximized ? "h-full" : ""}
      `}
      >
        {/* Supervisor Modal/Indicator with enhanced resize functionality */}
        <motion.div
          className={`
        relative w-[90%] lg:w-full bg-gray-600/25 backdrop-blur-lg border hover:backdrop-blur-xl border-gray-600/50 group rounded-xl mb-2 lg:mb-0 lg:rounded-b-none 
        shadow-2xl shadow-gray-950/50
        md:max-w-4xl
        ${isMaximized ? "max-w-full h-full flex flex-col" : "flex flex-col"}
        ${isDragging ? "select-none" : ""}
      `}
          animate={{
            height:
              isOpen && !isMaximized
                ? `${modalHeight}px`
                : isMaximized
                  ? "100%"
                  : "4rem",
            maxHeight:
              isOpen && !isMaximized
                ? `${modalHeight}px`
                : isMaximized
                  ? "100%"
                  : "2.5rem",
            opacity: isOpen ? 1 : 0.95,
          }}
          whileHover={{
            opacity: isOpen ? 1 : 1,
          }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smoother animation
            backgroundColor: { duration: 0.2 },
            opacity: { duration: 0.3 },
          }}
          initial={false}
        >
          {/* Resize Handle - appears when modal is open but not maximized */}
          {isOpen && !isMaximized && (
            <div
              className={`
                absolute -top-1 left-1/2 transform -translate-x-1/2 w-12 h-3 
                flex items-center justify-center cursor-row-resize z-10
                opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity duration-200
                ${isDragging ? "opacity-100" : ""}
              `}
              onMouseDown={handleResizeStart}
              onTouchStart={handleTouchResizeStart}
              title="Drag to resize"
            >
              <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
            </div>
          )}

          <div
            className={`
            flex items-center justify-between px-4 group
            transition-all duration-300 ease-in-out cursor-pointer
            ${
              isOpen
                ? "py-2 border-b border-gray-600/50"
                : "py-3 hover:border-emerald-400/30"
            }

          `}
            onClick={onToggle}
          >
            <div className="flex items-center gap-3">
              <Unlink className="w-4 h-4 text-lavender-400 group-hover:hidden" />
              <Link2 className="w-4 h-4 text-lavender-400 hidden group-hover:block -rotate-45" />
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={hoverContext}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{
                      duration: 0.1,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="text-xs text-lavender-400 font-medium block"
                  >
                    {getDisplayText()}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {isOpen ? (
                <>
                  <button
                    onClick={handleMaximizeToggle}
                    className="p-1.5 hover:bg-gray-800/50 rounded transition-colors group/maximize"
                    title={isMaximized ? "Minimize (Esc)" : "Maximize (⌘+M)"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-3 h-3 text-gray-400 group-hover/maximize:text-white transition-colors" />
                    ) : (
                      <Maximize2 className="w-3 h-3 text-gray-400 group-hover/maximize:text-white transition-colors" />
                    )}
                  </button>
                  {!isMaximized ? (
                    <button
                      onClick={onToggle}
                      onMouseEnter={() => handleHoverContext("expand")}
                      onMouseLeave={handleHoverContextReset}
                      className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                      title="Collapse"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                  ) : null}
                </>
              ) : (
                <div
                  onMouseEnter={() => handleHoverContext("expand")}
                  onMouseLeave={handleHoverContextReset}
                >
                  <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                </div>
              )}
            </div>
          </div>

          {/* Modal Content - responsive and resizable */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="overflow-hidden flex-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: 1,
                  height: isMaximized ? "100%" : "auto",
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  transition: {
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    opacity: { duration: 0.2 },
                  },
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  opacity: { duration: 0.3, delay: 0.1 },
                }}
              >
                <motion.div
                  className={`
                  overflow-y-auto scrollbar-thin scrollbar-dark
                  max-w-3xl mx-auto scrollbar-none
                  ${isMaximized ? "h-full" : ""}
                `}
                  style={
                    isOpen && !isMaximized
                      ? { height: `${modalHeight - 60}px` } // Account for header height
                      : {}
                  }
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{
                    y: -8,
                    opacity: 0,
                    transition: {
                      duration: 0.25,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    },
                  }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.1,
                  }}
                >
                  <SupervisorConversationContent
                    supervisorTurns={supervisorTurns}
                    supervisorStreamContent={supervisorStreamContent}
                    agentSteps={agentSteps}
                    onFocusAgent={onFocusAgent}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Supervisor Chat Input */}
        <motion.div
          className="
          relative w-full mx-auto bg-gray-600/25 backdrop-blur-lg border hover:backdrop-blur-xl border-gray-600/50 border-x-0 md:border-x border-b-0 md:border-b rounded-t-3xl lg:rounded-t-none md:rounded-b-3xl
          transition-all duration-300 ease-in-out md:max-w-4xl"
          initial={false}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder="What do you want to do next?"
            className="w-full rounded-t-3xl border-none max-h-24 h-auto p-4 outline-none ring-0 text-base md:text-sm bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none transition-all supervisor-textarea"
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
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {/* Performance toggle button */}
              <button
                onClick={togglePerformance}
                onMouseEnter={() => handleHoverContext("metrics")}
                onMouseLeave={handleHoverContextReset}
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

              {/* Reference display area */}
              {references.length > 0 && (
                <ReferenceStack
                  references={references}
                  maxVisible={3}
                  onRemove={(id) => {
                    removeReference(id);
                  }}
                  onShowAll={() => setShowReferencesModal(true)}
                  onReferenceClick={(reference) => {
                    // Optional: Handle reference click (e.g., show preview)
                    console.log("Reference clicked:", reference);
                  }}
                  className="ml-2"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Image attachment and modality icons */}
              <div
                onMouseEnter={() => handleHoverContext("attach")}
                onMouseLeave={handleHoverContextReset}
              >
                <ModalityIcons
                  selectedModel="gpt-4o" // Default to a model that supports images
                  onImagesChange={setImages}
                  onWebSearchToggle={() => {}} // Supervisor doesn't need web search toggle
                  isWebSearchEnabled={false}
                  images={images}
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
                onMouseEnter={() => {
                  if (prompt.trim() && !isLoading) {
                    handleHoverContext("send");
                  }
                }}
                onMouseLeave={handleHoverContextReset}
                className={`flex items-center gap-2 p-2 rounded-full transition-all ${
                  prompt.trim() && !isLoading
                    ? "bg-lavender-500 hover:bg-lavender-600 text-white shadow-lg hover:shadow-lavender-500/25 hover:scale-105"
                    : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                  </>
                ) : (
                  <>
                    {!prompt.trim() ? (
                      <Link2 size={16} className="-rotate-45" />
                    ) : (
                      <ArrowUp size={16} />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* References Modal */}
      <ReferencesModal
        isOpen={showReferencesModal}
        onClose={() => setShowReferencesModal(false)}
        references={references}
        onRemove={(id) => {
          removeReference(id);
        }}
        onClearAll={() => {
          clearAllReferences();
        }}
        onReorder={(newOrder) => {
          // Note: Global context doesn't support reordering yet
          console.log("Reorder not implemented in global context:", newOrder);
        }}
      />
    </div>
  );
}
