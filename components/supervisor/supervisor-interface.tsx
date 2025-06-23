"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { MessageBubble } from "../chat/message-bubble";
import { ChainProgress } from "../performance/chain-progress";
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
}: {
  mention: any;
  agentStep: any;
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

  const hasContent =
    agentStep &&
    (agentStep.response ||
      agentStep.streamedContent ||
      agentStep.error ||
      agentStep.isStreaming);

  return (
    <div className="border border-gray-700/30 rounded-lg text-xs overflow-hidden bg-gray-800/70">
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
            <div className="px-3 pb-3 space-y-3 border-t border-gray-700/30">
              {/* Task Prompt */}
              <div className="pt-3">
                <div className="text-sm text-gray-400 leading-relaxed">
                  {mention.taskPrompt}
                </div>
              </div>

              {/* Agent Response */}
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
                  ) : agentStep.response ? (
                    <div className="p-2 bg-gray-800/50 rounded">
                      {agentStep.response.length > 200
                        ? `${agentStep.response.slice(0, 200)}...`
                        : agentStep.response}
                    </div>
                  ) : agentStep.streamedContent ? (
                    <div className="p-2 bg-gray-800/50 rounded">
                      {agentStep.streamedContent.length > 200
                        ? `${agentStep.streamedContent.slice(0, 200)}...`
                        : agentStep.streamedContent}
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
  // Local state for maximize functionality
  const [isMaximized, setIsMaximized] = useState(false);
  // Chat input state
  const [prompt, setPrompt] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  const [filteredAgents, setFilteredAgents] = useState<AgentOption[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide functionality
  const [isInputHidden, setIsInputHidden] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  } = useCopyTracking();

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

  // Handle ESC key for maximize exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMaximized) {
        setIsMaximized(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  // Input handling functions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);

    // Reset hide timer on interaction
    resetHideTimer();

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

      // Format message with references for supervisor context
      let messageContent = prompt.trim();

      if (references.length > 0) {
        const referencesContext = references
          .map((ref, index) => {
            const sourceLabel =
              ref.agentName || `Node ${(ref.agentIndex ?? 0) + 1}`;
            return `[Reference ${index + 1}] From ${sourceLabel} (${ref.sourceType}): ${ref.content}`;
          })
          .join("\n\n");

        messageContent = `${messageContent}\n\n--- References ---\n${referencesContext}`;
      }

      onSupervisorSend(messageContent);

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

  // Auto-hide timer management
  const resetHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Only start hide timer if input is empty and not hovering
    if (!prompt.trim() && !isHovering) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsInputHidden(true);
      }, 5000); // 10 seconds
    }
  };

  const showInput = () => {
    setIsInputHidden(false);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  // Reset timer on prompt changes
  useEffect(() => {
    if (prompt.trim()) {
      // If there's text, always show input and clear timer
      setIsInputHidden(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    } else {
      // If empty, start/reset hide timer
      resetHideTimer();
    }
  }, [prompt, isHovering]);

  // Handle mouse interactions
  const handleMouseEnter = () => {
    setIsHovering(true);
    showInput();
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Start hide timer if input is empty
    if (!prompt.trim()) {
      resetHideTimer();
    }
  };

  // Cleanup hide timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
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

  // Handle maximize toggle
  const handleMaximizeToggle = () => {
    setIsMaximized(!isMaximized);
  };

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
        paddingBottom: isInputHidden
          ? "8px" // No spacing when input is hidden - flush with bottom
          : typeof window !== "undefined" &&
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
        transition-all duration-300 ease-in-out ${isInputHidden ? "h-min" : "h-full"}
        md:max-w-4xl
        ${isMaximized ? "h-full" : ""}
      `}
      >
        {/* Supervisor Modal/Indicator with smooth animations */}
        <motion.div
          className={`
        relative w-[90%] bg-gray-600/25 backdrop-blur-lg mb-2 group border border-gray-600/50 rounded-3xl 
        shadow-2xl shadow-gray-950/50
        transition-all duration-300 ease-in-out md:max-w-4xl
        ${isMaximized ? "max-w-full h-full flex flex-col" : ""}
        ${
          isOpen
            ? isMaximized
              ? "opacity-100"
              : "max-h-96 opacity-100 "
            : "max-h-16 opacity-95 hover:opacity-100 hover:bg-gray-700/60"
        }
      `}
          initial={false}
          animate={{
            y: !isOpen && isInputHidden ? 144 : 0, // Always 0 when input is hidden and modal is closed
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            mass: 0.5,
            duration: 0.25,
          }}
        >
          {/* Toggle Button - absolutely positioned above and centered */}
          {/* <button
            type="button"
            onClick={onToggle}
            className="absolute -top-6 left-0 right-0 mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <kbd className="text-gray-400/50 hover:text-gray-400/80 animate-pulse hover:animate-none text-xs font-medium z-20 transition-colors">
              {isOpen ? "Collapse" : "Open"}
            </kbd>
          </button> */}
          {/* Header - always visible, transforms based on state */}
          <div
            className={`
            flex items-center justify-between px-4 group
            transition-all duration-300 ease-in-out cursor-pointer
            ${
              isOpen
                ? "py-2 border-b border-gray-600/50"
                : "py-3 hover:border-emerald-400/30"
            }
            ${isInputHidden && !isOpen ? "hover:bg-gray-700/40 hover:scale-[1.02]" : ""}
          `}
            onClick={onToggle}
          >
            <div className="flex items-center gap-3">
              <Unlink className="w-4 h-4 text-lavender-400 group-hover:hidden" />
              <Link2 className="w-4 h-4 text-lavender-400 hidden group-hover:block -rotate-45" />
              <span className="text-xs text-lavender-400 font-medium">
                Supervisor
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {isOpen ? (
                <>
                  <button
                    onClick={handleMaximizeToggle}
                    className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                    title={isMaximized ? "Minimize" : "Maximize"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-3 h-3 text-gray-400 hover:text-white" />
                    ) : (
                      <Maximize2 className="w-3 h-3 text-gray-400 hover:text-white" />
                    )}
                  </button>
                  {!isMaximized ? (
                    <button
                      onClick={onToggle}
                      className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                      title="Collapse"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                  ) : null}
                </>
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
              )}
            </div>
          </div>

          {/* Modal Content - slides in/out smoothly */}
          <div
            className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${
              isOpen
                ? isMaximized
                  ? "flex-1 opacity-100"
                  : "max-h-80 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
          >
            <div
              className={`
              overflow-y-auto scrollbar-thin scrollbar-dark
              transition-transform duration-300 ease-in-out
              ${isOpen ? "translate-y-0" : "-translate-y-4"}
              ${isMaximized ? "h-full" : "max-h-80"}
            `}
            >
              <SupervisorConversationContent
                supervisorTurns={supervisorTurns}
                supervisorStreamContent={supervisorStreamContent}
                agentSteps={agentSteps}
              />
            </div>
          </div>
        </motion.div>

        {/* Supervisor Chat Input */}
        <motion.div
          className="
          relative w-full mx-auto bg-gray-600/25 backdrop-blur-lg border hover:backdrop-blur-xl border-gray-600/50 border-x-0 md:border-x border-b-0 md:border-b rounded-3xl rounded-b-none md:rounded-b-3xl
          transition-all duration-300 ease-in-out md:max-w-4xl"
          initial={false}
          animate={{
            y: isInputHidden && !isOpen ? 100 : 0,
            opacity: isInputHidden && !isOpen ? 0 : 1,
            scale: isInputHidden && !isOpen ? 0.95 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            mass: 0.5,
            duration: 0.15,
          }}
          style={{
            pointerEvents: isInputHidden ? "none" : "auto",
          }}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            onFocus={() => {
              showInput();
              resetHideTimer();
            }}
            onBlur={() => {
              if (!prompt.trim()) {
                resetHideTimer();
              }
            }}
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
              <ModalityIcons
                selectedModel="gpt-4o" // Default to a model that supports images
                onImagesChange={setImages}
                onWebSearchToggle={() => {}} // Supervisor doesn't need web search toggle
                isWebSearchEnabled={false}
                images={images}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
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
