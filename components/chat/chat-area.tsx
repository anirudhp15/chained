"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Forward,
  ChevronRight,
  ChevronLeft,
  Focus,
  Grid3X3,
  Link2,
  User,
  GitCommitHorizontal,
  GitFork,
  ArrowDown,
} from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ModelAvatar } from "./model-avatar";
import { MarkdownRenderer } from "./markdown-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { ConnectionBadge } from "../input/connection-selector";
import { AttachmentDisplay } from "../ui/AttachmentDisplay";
import { CopyButton } from "../ui/CopyButton";
import { TruncatedText } from "../ui/TruncatedText";
import { PerformanceMetrics } from "../performance/PerformanceMetrics";
import { ChainPerformanceSummary } from "../performance/ChainPerformanceSummary";
import { ThinkingDropdown } from "../ui/ThinkingDropdown";
import { useUser } from "@clerk/nextjs";
import { usePerformance } from "@/lib/performance-context";
import { motion, AnimatePresence } from "framer-motion";

interface AgentConversationTurn {
  userPrompt: string;
  agentResponse: string;
  timestamp: number;
  isStreaming?: boolean;
  isComplete?: boolean;
}

interface ChatAreaProps {
  sessionId: Id<"chatSessions"> | null;
  focusedAgentIndex?: number | null;
  onFocusAgent?: (agentIndex: number | null) => void;
  onLoadPreset?: (agents: any[]) => void;
  queuedAgents?: any[];
  agentConversations?: { [agentIndex: number]: AgentConversationTurn[] };
}

interface ColumnState {
  width: number; // percentage
  isCollapsed: boolean;
}

// Add focused column state interface
interface FocusedColumnState {
  focusedIndex: number | null;
  columnWidths: number[];
  isAnimating: boolean;
}

// Mobile Agent Card Component
interface MobileAgentCardProps {
  agent: any;
  index: number;
  onFocusToggle: (index: number) => void;
  expandedReasoning: string | null;
  toggleReasoning: (stepId: string) => void;
  agentGroups: any[];
  UserDisplay: React.ComponentType;
}

// Live Status Indicator Component
const LiveStatusIndicator = ({ agent }: { agent: any }) => {
  if (agent.isStreaming) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full status-indicator-dot status-indicator-generating"></div>
        <span className="text-gray-400 text-xs status-indicator-text">
          Generating
        </span>
      </div>
    );
  }

  if (agent.response || agent.streamedContent) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full status-indicator-dot status-indicator-complete"></div>
        <span className="text-gray-400 text-xs status-indicator-text">
          Complete
        </span>
      </div>
    );
  }

  if (agent.wasSkipped) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full status-indicator-dot"></div>
        <span className="text-gray-500 text-xs status-indicator-text">
          Skipped
        </span>
      </div>
    );
  }

  if (agent.error) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full status-indicator-dot"></div>
        <span className="text-gray-500 text-xs status-indicator-text">
          Error
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full status-indicator-dot"></div>
      <span className="text-gray-600 text-xs status-indicator-text">
        Waiting
      </span>
    </div>
  );
};

// Response Preview Line Component
const ResponsePreviewLine = ({ agent }: { agent: any }) => {
  const getPromptPreview = () => {
    if (!agent.prompt) return null;
    return agent.prompt.slice(0, 80) + (agent.prompt.length > 80 ? "..." : "");
  };

  const getResponsePreview = () => {
    const response = agent.response || agent.streamedContent;
    if (!response) return null;
    return response.slice(0, 100) + (response.length > 100 ? "..." : "");
  };

  const getAgentModelIcon = () => {
    return <ModelAvatar model={agent.model} size="xs" />;
  };

  const getConnectionIcon = () => {
    if (!agent.connectionType || agent.index === 0) return null;

    // Define connection types with proper typing
    type ConnectionType = "direct" | "conditional" | "parallel";

    const connectionIcons: Record<ConnectionType, React.ComponentType<any>> = {
      direct: GitCommitHorizontal,
      conditional: IoGitBranchOutline,
      parallel: GitFork,
    };

    const connectionColors: Record<ConnectionType, string> = {
      direct: "text-blue-400",
      conditional: "text-amber-400",
      parallel: " text-purple-400",
    };

    // Type guard to ensure we have a valid connection type
    const isValidConnectionType = (type: any): type is ConnectionType => {
      return type && typeof type === "string" && type in connectionIcons;
    };

    if (!isValidConnectionType(agent.connectionType)) return null;

    // Now TypeScript knows agent.connectionType is ConnectionType
    const connectionType = agent.connectionType as ConnectionType;
    const IconComponent = connectionIcons[connectionType];
    const colorClass = connectionColors[connectionType];

    return (
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${colorClass} flex-shrink-0`}
      >
        <IconComponent size={16} />
      </div>
    );
  };

  const getStatusMessage = () => {
    if (agent.isStreaming) {
      if (agent.connectionType === "parallel") {
        return "Executing in parallel...";
      }
      return "Generating response...";
    }

    if (agent.wasSkipped) {
      return "Skipped due to condition";
    }

    if (agent.error) {
      return "Failed to complete";
    }

    if (!agent.response && !agent.streamedContent) {
      if (agent.connectionType === "parallel") {
        return "Pending parallel execution";
      }
      return "Pending execution";
    }

    return null;
  };

  const promptPreview = getPromptPreview();
  const responsePreview = getResponsePreview();
  const statusMessage = getStatusMessage();
  const { user } = useUser();

  return (
    <div className="overflow-hidden mt-2 max-w-[22rem] sm:max-w-[32rem] md:max-w-[36rem]">
      {/* Prompt Preview Row */}
      {promptPreview && (
        <div className="text-xs text-left mobile-card-content-row pl-2">
          <div className="text-gray-400  flex gap-2 leading-relaxed line-clamp-1">
            <span className="font-normal text-lavender-400">
              <Forward size={16} />
            </span>{" "}
            {promptPreview}
          </div>
        </div>
      )}

      {/* Response/Status Row */}
      <div className="text-xs text-left mobile-card-content-row pl-2">
        {statusMessage ? (
          <div className="text-gray-400 leading-relaxed flex items-center gap-2">
            {getConnectionIcon()}
            {getAgentModelIcon()}
            {/* <span className="font-normal whitespace-nowrap text-lavender-400">
              {agent.name || `Node ${agent.index + 1}`}
            </span>{" "} */}
            {statusMessage}
            {agent.connectionType === "parallel" && agent.isStreaming && (
              <div className="flex items-center gap-1 ml-2">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-200"></div>
              </div>
            )}
          </div>
        ) : responsePreview ? (
          <div className="text-gray-400 whitespace-nowrap overflow-x-hidden leading-relaxed line-clamp-1 flex items-center gap-2">
            {getConnectionIcon()}
            {getAgentModelIcon()}
            {/* <span className="font-normal text-lavender-400">
              {agent.name || `Node ${agent.index + 1}`}
            </span>{" "} */}
            {responsePreview}
          </div>
        ) : null}
      </div>
    </div>
  );
};

function MobileAgentCard({
  agent,
  index,
  onFocusToggle,
  expandedReasoning,
  toggleReasoning,
  agentGroups,
  UserDisplay,
}: MobileAgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get performance state
  const { showDetailedPerformance } = usePerformance();

  return (
    <div className="bg-gray-950/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Enhanced Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex flex-col items-start justify-between p-4 hover:bg-gray-800/50 transition-colors "
      >
        <div
          className={`flex flex-row justify-between w-full ${
            !isExpanded ? "border-b border-gray-700/50 pb-4" : ""
          }`}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ModelAvatar model={agent.model} size="sm" />
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header: Agent info + live status */}
              <div className="flex flex-col text-left min-w-0">
                <span className="text-white font-medium text-sm sm:text-base truncate">
                  {agent.name || `Node ${agent.index + 1}`}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm truncate">
                  {agent.model}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onFocusToggle(agent.index);
              }}
              className="flex text-xs items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-lg px-2 py-1 transition-all cursor-pointer"
              title="Focus on this agent"
            >
              Focus
              <Focus
                size={14}
                className="text-gray-400 hover:text-lavender-400 flex-shrink-0"
              />
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
        {/* Content Preview */}
        {!isExpanded && <ResponsePreviewLine agent={agent} />}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 px-2 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {/* User Prompt */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg w-fit max-w-[80%] ml-auto p-3">
            <TruncatedText
              text={agent.prompt}
              maxLines={3}
              className="text-white text-sm"
              showButtonText="Show all"
              hideButtonText="Show less"
              buttonClassName="text-xs"
              gradientFrom="from-gray-800/50"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center">
              {/* Show ConnectionBadge for all agents with connections (including parallel agents) */}
              {(() => {
                // Simple parallel detection: if this agent is parallel OR any adjacent agent is parallel
                const isParallel =
                  agent.connectionType === "parallel" ||
                  (agent.index > 0 &&
                    agentGroups[agent.index - 1]?.connectionType ===
                      "parallel") ||
                  (agent.index < agentGroups.length - 1 &&
                    agentGroups[agent.index + 1]?.connectionType ===
                      "parallel");

                // Show parallel badge for parallel agents
                if (isParallel) {
                  return (
                    <ConnectionBadge
                      type="parallel"
                      sourceAgentIndex={agent.index}
                      condition={agent.connectionCondition}
                      agents={agentGroups.map((a) => ({
                        index: a.index,
                        name: a.name,
                        connectionType: a.connectionType,
                      }))}
                    />
                  );
                }

                // For non-parallel agents with connections, show normal badge
                if (
                  agent.connectionType &&
                  agent.index > 0 &&
                  agent.connectionType !== "parallel"
                ) {
                  return (
                    <ConnectionBadge
                      type={agent.connectionType}
                      sourceAgentIndex={
                        agent.sourceAgentIndex || agent.index - 1
                      }
                      condition={agent.connectionCondition}
                      agents={agentGroups.map((a) => ({
                        index: a.index,
                        name: a.name,
                        connectionType: a.connectionType,
                      }))}
                    />
                  );
                }

                return null;
              })()}
            </div>
            <CopyButton text={agent.prompt} size="sm" />
          </div>

          {/* Multimodal Attachments */}
          <AttachmentDisplay
            images={agent.images}
            audioBlob={agent.audioBlob}
            audioDuration={agent.audioDuration}
            webSearchData={agent.webSearchData}
            className="mt-3"
          />

          {/* Skipped Agent State */}
          {agent.wasSkipped && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <div className="text-xs text-orange-400 mb-1 flex items-center gap-2">
                <span>Skipped</span>
                <span className="font-mono">→?</span>
              </div>
              <p className="text-orange-300 text-sm">
                {agent.skipReason ||
                  "Agent was skipped due to conditional logic"}
              </p>
              {agent.connectionCondition && (
                <div className="mt-2 text-xs text-orange-400/70">
                  Condition:{" "}
                  <span className="font-mono">{agent.connectionCondition}</span>
                </div>
              )}
            </div>
          )}

          {/* Agent Response */}
          {!agent.wasSkipped &&
            (agent.response || agent.streamedContent || agent.isStreaming) && (
              <div className="px-1">
                <div className="text-xs text-lavender-400/80 mb-2 flex items-center justify-between">
                  {agent.isStreaming && (
                    <div className="flex items-center gap-1">
                      <div className="streaming-indicator"></div>
                      <span className="text-xs">Streaming...</span>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                {showDetailedPerformance &&
                  (agent.tokenUsage || agent.executionDuration) && (
                    <div className="my-2">
                      <PerformanceMetrics
                        tokenUsage={agent.tokenUsage}
                        executionDuration={agent.executionDuration}
                        tokensPerSecond={agent.tokensPerSecond}
                        estimatedCost={agent.estimatedCost}
                        model={agent.model}
                        size="sm"
                      />
                    </div>
                  )}

                {/* Thinking Dropdown */}
                <ThinkingDropdown
                  thinking={agent.thinking}
                  isThinking={agent.isThinking}
                  isStreaming={agent.isStreaming}
                  className="my-2"
                />

                {/* Main Response */}
                <div className="text-white text-sm break-words">
                  <MarkdownRenderer
                    content={agent.response || agent.streamedContent || ""}
                    isStreaming={agent.isStreaming}
                    className="break-words overflow-wrap-anywhere"
                  />
                </div>
                {!agent.isStreaming && (
                  <div className="mt-2">
                    <CopyButton
                      text={agent.response || agent.streamedContent || ""}
                      size="sm"
                    />
                  </div>
                )}

                {/* Legacy Reasoning Panel (for backward compatibility) */}
                {agent.reasoning && !agent.thinking && (
                  <div className="mt-3 border-t border-gray-600/50 pt-3">
                    <button
                      onClick={() => toggleReasoning(agent._id)}
                      className="flex items-center gap-2 text-xs text-lavender-400/80 hover:text-lavender-400 transition-colors"
                    >
                      {expandedReasoning === agent._id ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      <span>Reasoning</span>
                    </button>

                    {expandedReasoning === agent._id && (
                      <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-600/50 animate-in slide-in-from-top-2 duration-200">
                        <div className="text-xs text-gray-400 mb-2">
                          Model Reasoning:
                        </div>
                        <div className="text-sm text-gray-300 break-words overflow-hidden">
                          <MarkdownRenderer
                            content={agent.reasoning}
                            className="break-words overflow-wrap-anywhere"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Loading State */}
          {!agent.wasSkipped &&
            !agent.isStreaming &&
            !agent.isComplete &&
            !agent.response &&
            !agent.streamedContent &&
            !agent.error && (
              <div
                className={`border rounded-lg p-3 ${
                  agent.connectionType === "parallel"
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-gray-800/50 border-gray-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {agent.connectionType === "parallel" ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                  ) : (
                    <div className="thinking-dots">
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                    </div>
                  )}
                  <span className="text-xs text-lavender-400/80">
                    {(() => {
                      // Check if this agent is waiting for a previous agent to complete
                      if (
                        agent.connectionType === "direct" &&
                        agent.index > 0
                      ) {
                        const previousAgent = agentGroups.find(
                          (a) => a.index === agent.index - 1
                        );
                        if (
                          previousAgent &&
                          !previousAgent.isComplete &&
                          !previousAgent.wasSkipped
                        ) {
                          return `Waiting for Node ${previousAgent.index + 1} to complete...`;
                        }
                      }

                      if (
                        agent.connectionType === "conditional" &&
                        agent.index > 0
                      ) {
                        const sourceAgent = agentGroups.find(
                          (a) =>
                            a.index ===
                            (agent.sourceAgentIndex || agent.index - 1)
                        );
                        if (
                          sourceAgent &&
                          !sourceAgent.isComplete &&
                          !sourceAgent.wasSkipped
                        ) {
                          return `Waiting for Node ${sourceAgent.index + 1} to complete...`;
                        }
                      }

                      if (agent.connectionType === "parallel") {
                        return "Executing in parallel...";
                      }

                      return "Thinking...";
                    })()}
                  </span>
                </div>
              </div>
            )}

          {/* Error State */}
          {!agent.wasSkipped && agent.error && (
            <div
              className={`border rounded-lg p-3 ${
                agent.error.includes("Rate limit") ||
                agent.error.includes("rate limit")
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  agent.error.includes("Rate limit") ||
                  agent.error.includes("rate limit")
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {agent.error.includes("Rate limit") ||
                agent.error.includes("rate limit")
                  ? "Rate Limited"
                  : "Error"}
              </div>
              <p
                className={`text-sm ${
                  agent.error.includes("Rate limit") ||
                  agent.error.includes("rate limit")
                    ? "text-yellow-300"
                    : "text-red-300"
                }`}
              >
                {agent.error.includes("Rate limit") ||
                agent.error.includes("rate limit")
                  ? "Request rate limited. The system will automatically retry with intelligent spacing."
                  : agent.error}
              </p>
              {agent.connectionType === "parallel" &&
                (agent.error.includes("Rate limit") ||
                  agent.error.includes("rate limit")) && (
                  <div className="mt-2 text-xs text-yellow-400/70">
                    💡 Parallel agents use staggered execution to avoid rate
                    limits
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatArea({
  sessionId,
  focusedAgentIndex,
  onFocusAgent,
  onLoadPreset,
  queuedAgents,
  agentConversations = {},
}: ChatAreaProps) {
  const agentSteps = useQuery(
    api.queries.getAgentSteps,
    sessionId ? { sessionId } : "skip"
  );
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(
    null
  );

  // Get user information
  const { user } = useUser();

  // Get performance state
  const { showDetailedPerformance } = usePerformance();

  // Column resize state
  const [columnStates, setColumnStates] = useState<ColumnState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentContentRefs = useRef<{ [index: number]: HTMLDivElement | null }>(
    {}
  );

  // Scroll state management for each agent column
  const [agentScrollStates, setAgentScrollStates] = useState<{
    [index: number]: { showScrollToBottom: boolean; isAtBottom: boolean };
  }>({});

  // Focused column state management
  const [focusedColumnState, setFocusedColumnState] =
    useState<FocusedColumnState>({
      focusedIndex: null,
      columnWidths: [],
      isAnimating: false,
    });

  // Minimum column width in pixels
  const MIN_COLUMN_WIDTH = 256;

  // Calculate column widths based on focus state
  const calculateColumnWidths = useCallback(
    (agentCount: number, focusedIndex: number | null) => {
      if (!focusedIndex && focusedIndex !== 0) {
        // Equal widths when no agent is focused
        return Array(agentCount).fill(100 / agentCount);
      }

      const widths = Array(agentCount).fill(0);

      if (agentCount === 2) {
        // 2 agents: focused gets 66.67%, other gets 33.33%
        widths[focusedIndex] = 66.67;
        const otherIndex = focusedIndex === 0 ? 1 : 0;
        widths[otherIndex] = 33.33;
      } else {
        // 3+ agents: focused gets 50%, others share remaining 50%
        widths[focusedIndex] = 50;
        const remainingWidth = 50;
        const otherAgentsCount = agentCount - 1;
        const widthPerOther = remainingWidth / otherAgentsCount;

        for (let i = 0; i < agentCount; i++) {
          if (i !== focusedIndex) {
            widths[i] = widthPerOther;
          }
        }
      }

      return widths;
    },
    []
  );

  // Scroll handling functions
  const handleScroll = useCallback((agentIndex: number) => {
    const element = agentContentRefs.current[agentIndex];
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold
    const shouldShowButton = scrollTop > 200; // Show button after scrolling 200px up

    setAgentScrollStates((prev) => ({
      ...prev,
      [agentIndex]: {
        showScrollToBottom: shouldShowButton && !isAtBottom,
        isAtBottom,
      },
    }));
  }, []);

  const scrollToBottom = useCallback((agentIndex: number) => {
    const element = agentContentRefs.current[agentIndex];
    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Auto-scroll agent columns when streaming (legacy behavior)
  useEffect(() => {
    Object.entries(agentConversations).forEach(
      ([agentIndex, conversations]) => {
        const hasStreamingConversation = conversations.some(
          (conv) => conv.isStreaming
        );
        if (hasStreamingConversation) {
          const element = agentContentRefs.current[parseInt(agentIndex)];
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }
      }
    );
  }, [agentConversations]);

  // Custom UserDisplay component
  const UserDisplay = () => {
    const displayName =
      user?.fullName ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.primaryEmailAddress?.emailAddress ||
      "User";

    return (
      <div className="text-lavender-400 text-xs font-medium">{displayName}</div>
    );
  };

  // Group steps by agent and calculate layout
  const agentGroups = useMemo(() => {
    const stepsByAgent = new Map();

    // First, if we have queued agents, create placeholder entries for immediate UI display
    if (queuedAgents && queuedAgents.length > 0) {
      queuedAgents.forEach((agent, index) => {
        stepsByAgent.set(index, {
          index: index,
          model: agent.model,
          prompt: agent.prompt,
          name: agent.name,
          provider: agent.provider || agent.model,
          response: null,
          streamedContent: null,
          isStreaming: false,
          reasoning: null,
          thinking: null,
          isThinking: false,
          tokenUsage: null,
          error: null,
          isComplete: false,
          _id: `placeholder-${index}`, // Temporary ID
          wasSkipped: false,
          skipReason: null,
          connectionType: agent.connection?.type || "direct",
          connectionCondition: agent.connection?.condition,
          // Performance tracking fields
          executionStartTime: null,
          executionEndTime: null,
          executionDuration: null,
          tokensPerSecond: null,
          estimatedCost: null,
          // Add multimodal data
          images: agent.images,
          audioBlob: agent.audioBlob,
          audioDuration: agent.audioDuration,
          webSearchData: agent.webSearchData,
        });
      });
    }

    // Then update with actual database data
    if (agentSteps) {
      agentSteps.forEach((step) => {
        if (!stepsByAgent.has(step.index)) {
          stepsByAgent.set(step.index, {
            index: step.index,
            model: step.model,
            prompt: step.prompt,
            name: step.name,
            provider: step.provider,
            response: null,
            streamedContent: null,
            isStreaming: false,
            reasoning: null,
            thinking: null,
            isThinking: false,
            tokenUsage: null,
            error: null,
            isComplete: false,
            _id: step._id,
            wasSkipped: false,
            skipReason: null,
            connectionType: null,
            connectionCondition: null,
            // Performance tracking fields
            executionStartTime: null,
            executionEndTime: null,
            executionDuration: null,
            tokensPerSecond: null,
            estimatedCost: null,
          });
        }

        const agent = stepsByAgent.get(step.index);
        // Update with database data
        agent.response = step.response;
        agent.streamedContent = step.streamedContent;
        agent.isStreaming = step.isStreaming;
        agent.reasoning = step.reasoning;
        agent.thinking = step.thinking;
        agent.isThinking = step.isThinking;
        agent.tokenUsage = step.tokenUsage;
        agent.error = step.error;
        agent.isComplete = step.isComplete;
        agent.wasSkipped = step.wasSkipped || false;
        agent.skipReason = step.skipReason;
        agent.connectionType = step.connectionType;
        agent.connectionCondition = step.connectionCondition;
        // Performance tracking fields
        agent.executionStartTime = step.executionStartTime;
        agent.executionEndTime = step.executionEndTime;
        agent.executionDuration = step.executionDuration;
        agent.tokensPerSecond = step.tokensPerSecond;
        agent.estimatedCost = step.estimatedCost;
        // Update with real ID
        agent._id = step._id;
        // Preserve the name - update it if step has a name, otherwise keep the existing one
        if (step.name && step.name.trim()) {
          agent.name = step.name;
        }
      });
    }

    const groups = Array.from(stepsByAgent.values()).sort(
      (a, b) => a.index - b.index
    );

    // Initialize column states with proper widths
    if (columnStates.length !== groups.length && groups.length > 0) {
      const containerWidth =
        containerRef.current?.getBoundingClientRect().width ||
        window.innerWidth;
      const availableWidth = Math.max(
        containerWidth - 20,
        MIN_COLUMN_WIDTH * groups.length
      ); // Account for padding
      const equalWidth = availableWidth / groups.length;
      const widthPerColumn = Math.max(MIN_COLUMN_WIDTH, equalWidth);

      setColumnStates(
        groups.map(() => ({
          width: widthPerColumn,
          isCollapsed: false,
        }))
      );
    }

    return groups;
  }, [agentSteps, queuedAgents, columnStates.length]);

  // Auto-scroll agent columns to bottom on content changes and initial load
  useEffect(() => {
    // Scroll all agent columns to bottom when content changes
    agentGroups.forEach((agent) => {
      const element = agentContentRefs.current[agent.index];
      if (element) {
        // Use setTimeout to ensure DOM is updated before scrolling
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
        }, 10);
      }
    });
  }, [agentGroups, agentConversations]);

  // Initialize column widths when agentGroups change
  useEffect(() => {
    if (
      agentGroups.length > 0 &&
      focusedColumnState.columnWidths.length !== agentGroups.length
    ) {
      const initialWidths = calculateColumnWidths(agentGroups.length, null);
      setFocusedColumnState((prev) => ({
        ...prev,
        columnWidths: initialWidths,
      }));
    }
  }, [
    agentGroups.length,
    focusedColumnState.columnWidths.length,
    calculateColumnWidths,
  ]);

  // Handle focus toggle with smooth animation - now after agentGroups is defined
  const handleFocusToggle = useCallback(
    (agentIndex: number) => {
      setFocusedColumnState((prev) => {
        const newFocusedIndex =
          prev.focusedIndex === agentIndex ? null : agentIndex;
        const newWidths = calculateColumnWidths(
          agentGroups.length,
          newFocusedIndex
        );

        return {
          focusedIndex: newFocusedIndex,
          columnWidths: newWidths,
          isAnimating: false, // No longer needed with framer-motion
        };
      });

      // Update the parent component's focus state for input routing
      if (onFocusAgent) {
        const newFocusIndex =
          focusedColumnState.focusedIndex === agentIndex ? null : agentIndex;
        onFocusAgent(newFocusIndex);
      }
    },
    [
      focusedColumnState.focusedIndex,
      agentGroups.length,
      calculateColumnWidths,
      onFocusAgent,
    ]
  );

  const toggleReasoning = (stepId: string) => {
    setExpandedReasoning(expandedReasoning === stepId ? null : stepId);
  };

  if (!sessionId) {
    return (
      <div className="h-full overflow-y-auto px-4 flex items-center bg-gray-950">
        <div className="max-w-6xl w-full mx-auto">
          <WelcomeScreen onLoadPreset={onLoadPreset || (() => {})} />
        </div>
      </div>
    );
  }

  // Multi-Agent Chain View (with focused column support)
  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col overflow-hidden bg-gray-900/50  w-full relative"
    >
      {/* Chain Performance Summary with smooth animations */}
      {agentGroups.length > 1 && (
        <div
          className={`
            flex-shrink-0 border-b border-gray-800 overflow-hidden
            transition-all duration-300 ease-in-out
            ${
              showDetailedPerformance
                ? "max-h-32 opacity-100 p-2"
                : "max-h-0 opacity-0 p-0"
            }
          `}
        >
          <div
            className={`
            transition-transform duration-300 ease-in-out
            ${showDetailedPerformance ? "translate-y-0" : "-translate-y-4"}
          `}
          >
            <ChainPerformanceSummary
              steps={agentGroups.map((agent) => ({
                tokenUsage: agent.tokenUsage,
                executionDuration: agent.executionDuration,
                estimatedCost: agent.estimatedCost,
                model: agent.model,
                isComplete: agent.isComplete,
                wasSkipped: agent.wasSkipped,
              }))}
            />
          </div>
        </div>
      )}

      {/* Desktop: Multi-agent grid view with dynamic widths */}
      <div className="hidden md:flex flex-1 overflow-hidden w-full">
        {agentGroups.map((agent, index) => {
          const isFocused = focusedColumnState.focusedIndex === index;
          const isDimmed =
            focusedColumnState.focusedIndex !== null && !isFocused;
          const columnWidth =
            focusedColumnState.columnWidths[index] || 100 / agentGroups.length;

          return (
            <motion.div
              key={agent._id}
              className={`agent-container flex flex-col overflow-hidden relative ${
                index > 0 ? "border-l-2 border-gray-800" : ""
              } ${isFocused ? "bg-lavender-600/10" : ""}`}
              initial={false}
              animate={{
                width: `${columnWidth}%`,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
            >
              {/* Dimming overlay for non-focused columns */}
              {isDimmed && (
                <motion.div
                  className="absolute inset-0 bg-black/25 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Agent Column */}
              <div className="h-full flex flex-col relative z-20">
                {/* Agent Header */}
                <div className="agent-header flex flex-row justify-between flex-shrink-0 px-3 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <ModelAvatar model={agent.model} size="xs" />
                    <div className="flex flex-col">
                      <span className="text-white flex flex-row group gap-2 font-medium text-xs px-2 py-1 hover:bg-gray-800/50 rounded transition-colors group">
                        {agent.name || `Node ${agent.index + 1}`}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        {agent.model}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFocusToggle(agent.index)}
                    className="flex items-center gap-2"
                    title={
                      focusedColumnState.focusedIndex === index
                        ? "Unfocus this agent"
                        : "Focus on this agent"
                    }
                    style={{
                      display: agentGroups.length === 1 ? "none" : "flex",
                    }}
                  >
                    <span className="text-xs text-gray-400 group-hover:text-lavender-400 transition-all duration-200">
                      {focusedColumnState.focusedIndex === index
                        ? "Unfocus"
                        : "Focus"}
                    </span>
                    <Focus
                      size={10}
                      className="text-gray-400 hover:text-lavender-400 group-hover:scale-110 transition-all"
                    />
                  </button>
                </div>

                {/* Agent Content Container with Scroll Button */}
                <div className="flex-1 relative overflow-hidden max-w-4xl mx-auto">
                  {/* Agent Content - Individually Scrollable */}
                  <div
                    ref={(el) => {
                      agentContentRefs.current[agent.index] = el;
                    }}
                    className="h-full overflow-y-auto overflow-x-hidden px-3 py-4 space-y-8 agent-content scrollbar-none"
                    onScroll={() => handleScroll(agent.index)}
                    style={{
                      paddingBottom: "8rem", // Extra space at bottom for better UX
                    }}
                  >
                    {/* User Prompt */}
                    <div className="w-full justify-end flex px-0.5">
                      <div className="relative w-auto max-w-[80%] bg-gray-800/90  rounded-xl py-2 px-3 gap-2 flex flex-col">
                        <div className="absolute right-2 -bottom-8 flex flex-row gap-2 items-center">
                          {/* Show ConnectionBadge for all agents with connections (including parallel agents) */}
                          {(() => {
                            // Simple parallel detection: if this agent is parallel OR any adjacent agent is parallel
                            const isParallel =
                              agent.connectionType === "parallel" ||
                              (agent.index > 0 &&
                                agentGroups[agent.index - 1]?.connectionType ===
                                  "parallel") ||
                              (agent.index < agentGroups.length - 1 &&
                                agentGroups[agent.index + 1]?.connectionType ===
                                  "parallel");

                            // Show parallel badge for parallel agents
                            if (isParallel) {
                              return (
                                <ConnectionBadge
                                  type="parallel"
                                  sourceAgentIndex={agent.index}
                                  condition={agent.connectionCondition}
                                  agents={agentGroups.map((a) => ({
                                    index: a.index,
                                    name: a.name,
                                    connectionType: a.connectionType,
                                  }))}
                                />
                              );
                            }

                            // For non-parallel agents with connections, show normal badge
                            if (
                              agent.connectionType &&
                              agent.index > 0 &&
                              agent.connectionType !== "parallel"
                            ) {
                              return (
                                <ConnectionBadge
                                  type={agent.connectionType}
                                  sourceAgentIndex={
                                    agent.sourceAgentIndex || agent.index - 1
                                  }
                                  condition={agent.connectionCondition}
                                  agents={agentGroups.map((a) => ({
                                    index: a.index,
                                    name: a.name,
                                    connectionType: a.connectionType,
                                  }))}
                                />
                              );
                            }

                            return null;
                          })()}
                          <CopyButton text={agent.prompt} size="sm" />
                        </div>

                        <TruncatedText
                          text={agent.prompt}
                          maxLines={3}
                          className="text-white text-sm"
                          showButtonText="Show all"
                          hideButtonText="Show less"
                          buttonClassName="text-xs"
                          gradientFrom="from-gray-800/90"
                        />
                      </div>
                    </div>

                    {/* Multimodal Attachments */}
                    <AttachmentDisplay
                      images={agent.images}
                      audioBlob={agent.audioBlob}
                      audioDuration={agent.audioDuration}
                      webSearchData={agent.webSearchData}
                      className="mt-3"
                    />

                    {/* Skipped Agent State */}
                    {agent.wasSkipped && (
                      <div className="flex gap-4">
                        <ModelAvatar model={agent.model} size="sm" />
                        <div className="flex-1">
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                            <div className="text-sm text-orange-400 mb-2 flex items-center gap-2">
                              <span>Skipped</span>
                              <span className="font-mono">→</span>
                            </div>
                            <p className="text-orange-300 text-base">
                              {agent.skipReason ||
                                "Agent was skipped due to conditional logic"}
                            </p>
                            {agent.connectionCondition && (
                              <div className="mt-3 text-sm text-orange-400/70">
                                Condition:{" "}
                                <span className="font-mono">
                                  {agent.connectionCondition}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agent Conversation History */}
                    {!agent.wasSkipped && (
                      <div className="space-y-4">
                        {/* EXCLUSIVE RENDERING LOGIC: Prioritize agentConversations over legacy agent step data */}
                        {agentConversations[agent.index] &&
                        agentConversations[agent.index].length > 0
                          ? // NEW: Render conversation history from agentConversations state (supervisor mode)
                            agentConversations[agent.index].map(
                              (conversation, turnIndex) => (
                                <div key={turnIndex} className="space-y-3">
                                  {/* User Message */}
                                  <div className="flex justify-end">
                                    <div className="max-w-full bg-blue-600/20 border border-blue-500/30 rounded-xl px-3 py-2">
                                      <div className="text-white text-sm">
                                        {conversation.userPrompt}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Agent Response */}
                                  <div className="flex justify-start">
                                    <div className="max-w-full p-2 w-full">
                                      <div className="text-white text-sm break-words">
                                        <MarkdownRenderer
                                          content={conversation.agentResponse}
                                          isStreaming={conversation.isStreaming}
                                          className="break-words overflow-wrap-anywhere"
                                        />
                                      </div>
                                      {!conversation.isStreaming &&
                                        conversation.agentResponse && (
                                          <div className="mt-2 flex justify-end">
                                            <CopyButton
                                              text={conversation.agentResponse}
                                              size="sm"
                                            />
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )
                          : // LEGACY: Show agent step response only if no conversation history exists
                            (agent.response ||
                              agent.streamedContent ||
                              agent.isStreaming) && (
                              <div className="flex justify-start">
                                <div className="max-w-full p-2 w-full">
                                  <div className="text-white text-sm break-words">
                                    <MarkdownRenderer
                                      content={
                                        agent.response ||
                                        agent.streamedContent ||
                                        ""
                                      }
                                      isStreaming={agent.isStreaming}
                                      className="break-words overflow-wrap-anywhere"
                                    />
                                  </div>
                                  {!agent.isStreaming &&
                                    (agent.response ||
                                      agent.streamedContent) && (
                                      <div className="mt-2 flex justify-end">
                                        <CopyButton
                                          text={
                                            agent.response ||
                                            agent.streamedContent ||
                                            ""
                                          }
                                          size="sm"
                                        />
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}

                        {/* Loading State - only show if no conversation history and no legacy response */}
                        {(!agentConversations[agent.index] ||
                          agentConversations[agent.index].length === 0) &&
                          !agent.isStreaming &&
                          !agent.isComplete &&
                          !agent.response &&
                          !agent.streamedContent &&
                          !agent.error && (
                            <div className="pt-4">
                              <div
                                className={`flex items-center gap-3 border rounded-lg p-2 ${
                                  agent.connectionType === "parallel"
                                    ? "bg-purple-500/10 border-purple-500/30"
                                    : "bg-gray-800/50 border-gray-700/50"
                                }`}
                              >
                                <span className="text-xs text-lavender-400/80">
                                  {(() => {
                                    // Check if this agent is waiting for a previous agent to complete
                                    if (
                                      agent.connectionType === "direct" &&
                                      agent.index > 0
                                    ) {
                                      const previousAgent = agentGroups.find(
                                        (a) => a.index === agent.index - 1
                                      );
                                      if (
                                        previousAgent &&
                                        !previousAgent.isComplete &&
                                        !previousAgent.wasSkipped
                                      ) {
                                        return `Waiting for Node ${previousAgent.index + 1} to complete...`;
                                      }
                                    }

                                    if (
                                      agent.connectionType === "conditional" &&
                                      agent.index > 0
                                    ) {
                                      const sourceAgent = agentGroups.find(
                                        (a) =>
                                          a.index ===
                                          (agent.sourceAgentIndex ||
                                            agent.index - 1)
                                      );
                                      if (
                                        sourceAgent &&
                                        !sourceAgent.isComplete &&
                                        !sourceAgent.wasSkipped
                                      ) {
                                        return `Waiting for Node ${sourceAgent.index + 1} to complete...`;
                                      }
                                    }

                                    if (agent.connectionType === "parallel") {
                                      return "Executing in parallel...";
                                    }

                                    return "Thinking...";
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Error State */}
                    {!agent.wasSkipped && agent.error && (
                      <div
                        className={`border rounded-lg p-3 ${
                          agent.error.includes("Rate limit") ||
                          agent.error.includes("rate limit")
                            ? "bg-yellow-500/10 border-yellow-500/30"
                            : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 ${
                            agent.error.includes("Rate limit") ||
                            agent.error.includes("rate limit")
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {agent.error.includes("Rate limit") ||
                          agent.error.includes("rate limit")
                            ? "Rate Limited"
                            : "Error"}
                        </div>
                        <p
                          className={`text-sm ${
                            agent.error.includes("Rate limit") ||
                            agent.error.includes("rate limit")
                              ? "text-yellow-300"
                              : "text-red-300"
                          }`}
                        >
                          {agent.error.includes("Rate limit") ||
                          agent.error.includes("rate limit")
                            ? "Request rate limited. The system will automatically retry with intelligent spacing."
                            : agent.error}
                        </p>
                        {agent.connectionType === "parallel" &&
                          (agent.error.includes("Rate limit") ||
                            agent.error.includes("rate limit")) && (
                            <div className="mt-2 text-xs text-yellow-400/70">
                              💡 Parallel agents use staggered execution to
                              avoid rate limits
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Scroll to Bottom Button */}
                  <AnimatePresence>
                    {agentScrollStates[agent.index]?.showScrollToBottom && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => scrollToBottom(agent.index)}
                        className="absolute top-4 left-0 right-0 mx-auto w-min bg-lavender-600/75 hover:bg-lavender-600 text-white p-2 rounded-full shadow-lg z-30 transition-all duration-200 hover:scale-105"
                        title="Scroll to bottom"
                      >
                        <ArrowDown size={16} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile: Vertical stacked agents */}
      <div className="md:hidden flex-1 overflow-y-auto px-2 py-2 scrollbar-none space-y-4">
        {agentGroups.map((agent, index) => (
          <MobileAgentCard
            key={agent._id}
            agent={agent}
            index={index}
            onFocusToggle={handleFocusToggle}
            expandedReasoning={expandedReasoning}
            toggleReasoning={toggleReasoning}
            agentGroups={agentGroups}
            UserDisplay={UserDisplay}
          />
        ))}
      </div>
    </div>
  );
}
