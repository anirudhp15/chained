"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  ChevronRight,
  ChevronLeft,
  Focus,
  Grid3X3,
  Link2,
  User,
  GitCommitHorizontal,
  GitFork,
} from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";
import { useState, useMemo, useRef, useCallback } from "react";
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

interface ChatAreaProps {
  sessionId: Id<"chatSessions"> | null;
  focusedAgentIndex?: number | null;
  onFocusAgent?: (agentIndex: number | null) => void;
  onLoadPreset?: (agents: any[]) => void;
}

interface ColumnState {
  width: number; // percentage
  isCollapsed: boolean;
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
    if (!agent.prompt?.trim()) return null;
    const preview = agent.prompt.substring(0, 80);
    return preview + (agent.prompt.length > 80 ? "..." : "");
  };

  const getResponsePreview = () => {
    const content = agent.response || agent.streamedContent;
    if (!content) return null;
    const preview = content.substring(0, 90);
    return preview + (content.length > 90 ? "..." : "");
  };

  const getAgentDisplayName = () => {
    // Debug: Log the agent object to see what's available
    console.log("Agent object in ResponsePreviewLine:", {
      name: agent.name,
      agentName: agent.agentName,
      index: agent.index,
      allKeys: Object.keys(agent),
    });

    // Try multiple sources for the agent name with proper fallback
    return agent.name || agent.agentName || `Node ${(agent.index || 0) + 1}`;
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
      direct: "bg-blue-500/20 text-blue-400",
      conditional: "bg-amber-500/20 text-amber-400",
      parallel: "bg-purple-500/20 text-purple-400",
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

  const promptPreview = getPromptPreview();
  const responsePreview = getResponsePreview();
  const { user } = useUser();
  return (
    <div className="overflow-hidden mt-2">
      {/* Prompt Preview Row */}
      {promptPreview && (
        <div className="text-xs text-left mobile-card-content-row pl-2">
          <div className="text-gray-400 leading-relaxed line-clamp-1">
            <span className="font-normal text-lavender-400">
              {user?.fullName || user?.firstName || "User"}
            </span>{" "}
            {promptPreview}
          </div>
        </div>
      )}

      {/* Response/Status Row */}
      <div className="text-xs text-left mobile-card-content-row pl-2">
        {agent.isStreaming ? (
          <>
            <div className="text-gray-400 leading-relaxed flex items-center gap-2">
              {getConnectionIcon()}
              <span className="font-normal whitespace-nowrap text-lavender-400">
                {getAgentDisplayName()}
              </span>{" "}
              Generating response...
            </div>
          </>
        ) : responsePreview ? (
          <>
            <div className="text-gray-400 whitespace-nowrap  leading-relaxed line-clamp-1 flex items-center gap-2">
              {getConnectionIcon()}
              <span className="font-normal text-lavender-400">
                {getAgentDisplayName()}
              </span>{" "}
              {responsePreview}
            </div>
          </>
        ) : agent.wasSkipped ? (
          <>
            <div className="text-gray-400 leading-relaxed flex items-center gap-2">
              {getConnectionIcon()}
              <span className="font-normal text-lavender-400">
                {getAgentDisplayName()}:
              </span>{" "}
              Skipped due to condition
            </div>
          </>
        ) : agent.error ? (
          <>
            <div className="text-gray-400 leading-relaxed flex items-center gap-2">
              {getConnectionIcon()}
              <span className="font-normal text-lavender-400">
                {getAgentDisplayName()}:
              </span>{" "}
              Failed to complete
            </div>
          </>
        ) : (
          <>
            <div className="text-gray-400 leading-relaxed flex items-center gap-2">
              {getConnectionIcon()}
              <span className="font-normal text-lavender-400">
                {getAgentDisplayName()}:
              </span>{" "}
              Pending execution
            </div>
          </>
        )}
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
        <div className="border-t border-gray-700/50 p-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* User Prompt */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserDisplay />
                {agent.connectionType && agent.index > 0 && (
                  <ConnectionBadge
                    type={agent.connectionType}
                    sourceAgentIndex={agent.index - 1}
                    condition={agent.connectionCondition}
                    agents={agentGroups}
                  />
                )}
              </div>
              <CopyButton text={agent.prompt} size="sm" />
            </div>
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
                  <span className="flex items-center gap-2">
                    <ModelAvatar model={agent.model} size="sm" />
                    {agent.name || `Node ${agent.index + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {agent.isStreaming && (
                      <div className="flex items-center gap-1">
                        <div className="streaming-indicator"></div>
                        <span className="text-xs">Streaming...</span>
                      </div>
                    )}
                    <CopyButton
                      text={agent.response || agent.streamedContent || ""}
                      size="sm"
                    />
                  </div>
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
                  {agent.isStreaming && (
                    <span className="inline-block w-1.5 h-3 bg-lavender-400 ml-1 streaming-cursor"></span>
                  )}
                </div>

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
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="thinking-dots">
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                  </div>
                  <span className="text-xs text-lavender-400/80">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

          {/* Error State */}
          {!agent.wasSkipped && agent.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1">Error</div>
              <p className="text-red-300 text-sm">{agent.error}</p>
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

  // Minimum column width in pixels
  const MIN_COLUMN_WIDTH = 256;

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
    if (!agentSteps) return [];

    const stepsByAgent = new Map();

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
      // Preserve the name - update it if step has a name, otherwise keep the existing one
      if (step.name && step.name.trim()) {
        agent.name = step.name;
      }
    });

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
  }, [agentSteps, columnStates.length]);

  // Get focused agent data
  const focusedAgent =
    focusedAgentIndex !== null && focusedAgentIndex !== undefined
      ? agentGroups[focusedAgentIndex]
      : null;

  // Handle focus toggle
  const handleFocusToggle = useCallback(
    (agentIndex: number) => {
      if (onFocusAgent) {
        const newFocusIndex =
          focusedAgentIndex === agentIndex ? null : agentIndex;
        onFocusAgent(newFocusIndex);
      }
    },
    [focusedAgentIndex, onFocusAgent]
  );

  const toggleReasoning = (stepId: string) => {
    setExpandedReasoning(expandedReasoning === stepId ? null : stepId);
  };

  // Render focused agent view (extracted to eliminate duplication)
  const renderFocusedAgent = (agent: any) => (
    <div className="h-full flex flex-col">
      {/* Individual Agent Performance Summary */}
      <div className="flex-shrink-0 p-2 border-b border-gray-700/30">
        <ChainPerformanceSummary
          steps={[
            {
              tokenUsage: agent.tokenUsage,
              executionDuration: agent.executionDuration,
              estimatedCost: agent.estimatedCost,
              model: agent.model,
              isComplete: agent.isComplete,
              wasSkipped: agent.wasSkipped,
            },
          ]}
        />
      </div>
      {/* Focus Mode Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModelAvatar model={agent.model} size="xs" />
            <div className="flex flex-col">
              <span className="flex flex-row gap-2 px-2 py-1 group transition-all duration-200 hover:bg-gray-700/50 rounded-lg text-white font-medium text-xs">
                {agent.name || `Node ${agent.index + 1}`}
              </span>
              <span className="text-gray-400 text-xs ml-2">{agent.model}</span>
            </div>
          </div>
          <button
            onClick={() => handleFocusToggle(agent.index)}
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-lg px-2 py-1 transition-all group cursor-pointer"
          >
            <span className="text-xs group-hover:text-lavender-400 transition-all duration-200">
              Chain
            </span>
            <Link2
              size={14}
              className="group-hover:scale-110 group-hover:-rotate-45 transition-transform"
            />
          </button>
        </div>
      </div>

      {/* Focused Agent Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-dark">
        <div className="max-w-4xl mx-auto p-4 pb-64 space-y-6">
          {/* User Prompt */}
          <div className="w-full">
            <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
              <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-3">
                  <UserDisplay />
                  {agent.connectionType && agent.index > 0 && (
                    <ConnectionBadge
                      type={agent.connectionType}
                      sourceAgentIndex={agent.index - 1}
                      condition={agent.connectionCondition}
                      agents={agentGroups}
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <CopyButton text={agent.prompt} size="sm" />
                </div>
              </div>
              <TruncatedText
                text={agent.prompt}
                maxLines={4}
                className="text-white text-base"
                showButtonText="View full prompt"
                hideButtonText="Show less"
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
                    <span className="font-mono">→?</span>
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

          {/* Agent Response */}
          {!agent.wasSkipped &&
            (agent.response || agent.streamedContent || agent.isStreaming) && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="bg-gray-800/25 border border-gray-700/50 rounded-xl p-4">
                    <div className="text-sm text-lavender-400/80 mb-3 flex items-center justify-between">
                      <span className="flex gap-2 items-center">
                        {" "}
                        <ModelAvatar model={agent.model} size="sm" />
                        {agent.name || `Node ${agent.index + 1}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <CopyButton
                          text={agent.response || agent.streamedContent || ""}
                          size="sm"
                        />
                        {agent.isStreaming && (
                          <div className="flex items-center gap-1">
                            <div className="streaming-indicator"></div>
                            <span className="text-sm">Streaming...</span>
                          </div>
                        )}
                      </div>
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
                    <div className="text-white text-base break-words overflow-hidden">
                      <MarkdownRenderer
                        content={agent.response || agent.streamedContent || ""}
                        isStreaming={agent.isStreaming}
                        className="break-words overflow-wrap-anywhere"
                      />
                      {agent.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-lavender-400 ml-1 streaming-cursor"></span>
                      )}
                    </div>

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
                            <div className="text-base text-gray-300 break-words overflow-hidden">
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
                </div>
              </div>
            )}

          {/* Error State */}
          {!agent.wasSkipped && agent.error && (
            <div className="flex gap-4">
              <ModelAvatar model={agent.model} size="sm" />
              <div className="flex-1">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="text-sm text-red-400 mb-2">Error</div>
                  <p className="text-red-300 text-base">{agent.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {!agent.wasSkipped &&
            !agent.isComplete &&
            !agent.response &&
            !agent.streamedContent &&
            !agent.error && (
              <div className="flex gap-4">
                <ModelAvatar model={agent.model} size="sm" />
                <div className="flex-1">
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="text-sm text-lavender-400/80 mb-3">
                      Thinking...
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="thinking-dots">
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                      </div>
                      <span className="text-xs text-lavender-400/80">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );

  if (!sessionId) {
    return (
      <div className="h-full overflow-y-auto px-4 flex items-center bg-gray-950">
        <div className="max-w-6xl w-full mx-auto">
          <WelcomeScreen onLoadPreset={onLoadPreset || (() => {})} />
        </div>
      </div>
    );
  }

  // Focus Mode - Show focused agent
  if (focusedAgent !== null) {
    return renderFocusedAgent(focusedAgent);
  }

  // Multi-Agent Chain View
  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col overflow-hidden bg-gray-950/50  w-full relative"
    >
      {/* Chain Performance Summary */}
      {agentGroups.length > 1 && (
        <div className="flex-shrink-0 px-2 md:px-4 py-2 md:py-3 border-b border-gray-700/30">
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
      )}

      {/* Desktop: Multi-agent grid view */}
      <div
        className="hidden md:grid flex-1 overflow-hidden w-full gap-1"
        style={{
          gridTemplateColumns: `repeat(${agentGroups.length}, minmax(${MIN_COLUMN_WIDTH}px, 1fr))`,
        }}
      >
        {agentGroups.map((agent, index) => (
          <div
            key={agent._id}
            className={`agent-container flex flex-col overflow-hidden ${
              index > 0 ? "border-l border-gray-800/70" : ""
            }`}
          >
            {/* Agent Column */}
            <div className="h-full flex flex-col">
              {/* Agent Header */}
              <div className="agent-header flex flex-row justify-between flex-shrink-0 px-3 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
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
                  title="Focus on this agent"
                >
                  <span className="text-xs text-gray-400  group-hover:text-lavender-400 transition-all duration-200 ">
                    Focus
                  </span>
                  <Focus
                    size={10}
                    className="text-gray-400 hover:text-lavender-400 group-hover:scale-110 transition-all"
                  />
                </button>
              </div>

              {/* Agent Content - Individually Scrollable */}
              <div className="flex-1 overflow-y-auto px-3 py-4 pb-64 space-y-4 agent-content scrollbar-thin scrollbar-dark">
                {/* User Prompt */}
                <div className="w-full px-0.5">
                  <div className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex flex-row items-center gap-2 pb-2">
                      <UserDisplay />
                      {agent.connectionType && agent.index > 0 && (
                        <ConnectionBadge
                          type={agent.connectionType}
                          sourceAgentIndex={agent.index - 1}
                          condition={agent.connectionCondition}
                          agents={agentGroups}
                        />
                      )}
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
                          <span className="font-mono">→?</span>
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

                {/* Agent Response or Loading State */}
                {!agent.wasSkipped && (
                  <>
                    {/* Has content or is streaming */}
                    {(agent.response ||
                      agent.streamedContent ||
                      agent.isStreaming) && (
                      <div className="flex gap-4">
                        {/* <ModelAvatar model={agent.model} size="sm" /> */}
                        <div className="flex-1">
                          <div className="p-2 ">
                            <div className="text-xs text-lavender-400/80 mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <ModelAvatar model={agent.model} size="sm" />
                                {agent.name || `Node ${agent.index + 1}`}
                              </span>
                              <div className="flex items-center gap-2">
                                {agent.isStreaming && (
                                  <div className="flex items-center gap-1">
                                    <div className="streaming-indicator"></div>
                                    <span className="text-xs">
                                      Streaming...
                                    </span>
                                  </div>
                                )}
                                <CopyButton
                                  text={
                                    agent.response ||
                                    agent.streamedContent ||
                                    ""
                                  }
                                  size="sm"
                                />
                              </div>
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
                                content={
                                  agent.response || agent.streamedContent || ""
                                }
                                isStreaming={agent.isStreaming}
                                className="break-words overflow-wrap-anywhere"
                              />
                              {agent.isStreaming && (
                                <span className="inline-block w-1.5 h-3 bg-lavender-400 ml-1 streaming-cursor"></span>
                              )}
                            </div>

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
                                    <div className="text-base text-gray-300 break-words overflow-hidden">
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
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {!agent.isStreaming &&
                      !agent.isComplete &&
                      !agent.response &&
                      !agent.streamedContent &&
                      !agent.error && (
                        <div className="flex gap-4">
                          <ModelAvatar model={agent.model} size="sm" />
                          <div className="flex-1">
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="thinking-dots">
                                  <div className="thinking-dot"></div>
                                  <div className="thinking-dot"></div>
                                  <div className="thinking-dot"></div>
                                </div>
                                <span className="text-xs text-lavender-400/80">
                                  Thinking...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  </>
                )}

                {/* Error State */}
                {!agent.wasSkipped && agent.error && (
                  <div className="flex gap-4">
                    <ModelAvatar model={agent.model} size="sm" />
                    <div className="flex-1">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-xs text-red-400 mb-1">Error</div>
                        <p className="text-red-300 text-base">{agent.error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Vertical stacked agents */}
      <div className="md:hidden flex-1 overflow-y-auto px-2 py-2 pb-64 space-y-4">
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
