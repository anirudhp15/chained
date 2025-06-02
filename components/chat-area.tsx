"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
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
} from "lucide-react";
import { useState, useMemo, useRef, useCallback } from "react";
import { ModelAvatar } from "./model-avatar";
import { MarkdownRenderer } from "./markdown-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { ConnectionBadge } from "./connection-selector";
import { AttachmentDisplay } from "./ui/AttachmentDisplay";
import { CopyButton } from "./ui/CopyButton";
import { TruncatedText } from "./ui/TruncatedText";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { ChainPerformanceSummary } from "./ChainPerformanceSummary";
import { ThinkingDropdown } from "./ui/ThinkingDropdown";
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
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ModelAvatar model={agent.model} size="sm" />
          <div className="flex flex-col items-start">
            <span className="text-white font-medium text-sm">
              {agent.name || `Node ${agent.index + 1}`}
            </span>
            <span className="text-gray-400 text-xs">{agent.model}</span>
          </div>
          {agent.isStreaming && (
            <div className="flex items-center gap-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"></div>
                <div
                  className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <span className="text-xs text-lavender-400">generating</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onFocusToggle(agent.index);
            }}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors cursor-pointer"
            title="Focus on this agent"
          >
            <Focus
              size={14}
              className="text-gray-400 hover:text-lavender-400"
            />
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* User Prompt */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserDisplay />
              {agent.connectionType && agent.index > 0 && (
                <ConnectionBadge
                  type={agent.connectionType}
                  sourceAgentIndex={agent.index - 1}
                  condition={agent.connectionCondition}
                  size="sm"
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
              gradientFrom="from-gray-800/50"
            />
            <div className="mt-2 flex justify-end">
              <CopyButton text={agent.prompt} size="sm" />
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
              <div className="p-2">
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
                      className="flex items-center gap-2 text-xs text-lavender-400/80 hover:text-lavender-300 transition-colors"
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
      if (step.name) {
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
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-700/30">
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
      <div className="flex-shrink-0 px-3 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModelAvatar model={agent.model} size="xs" />
            <div className="flex flex-col">
              <span className="flex flex-row gap-2 px-2 py-1 group transition-all duration-200 hover:bg-gray-700/50 rounded-lg text-white font-medium text-xs">
                {agent.name || `Node ${agent.index + 1}`}
                <button
                  onClick={() => handleFocusToggle(agent.index)}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-all group"
                >
                  <Link2
                    size={14}
                    className="group-hover:scale-110 group-hover:-rotate-12 transition-transform"
                  />
                  <span className="text-xs group-hover:block hidden transition-all duration-200">
                    Chain
                  </span>
                </button>
              </span>
              <span className="text-gray-400 text-xs ml-2">{agent.model}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Focused Agent Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-dark">
        <div className="max-w-4xl mx-auto px-6 py-6 pb-64 space-y-6">
          {/* User Prompt */}
          <div className="w-full">
            <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl px-6 py-4">
              <div className="flex flex-row gap-3">
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
                          className="flex items-center gap-2 text-xs text-lavender-400/80 hover:text-lavender-300 transition-colors"
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
              <div className="agent-header flex-shrink-0 px-3 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
                <div className="flex items-center gap-2">
                  <ModelAvatar model={agent.model} size="xs" />
                  <div className="flex flex-col">
                    <span className="text-white flex flex-row group gap-2 font-medium text-xs px-2 py-1 hover:bg-gray-800/50 rounded transition-colors group">
                      {agent.name || `Node ${agent.index + 1}`}
                      <button
                        onClick={() => handleFocusToggle(agent.index)}
                        className="flex items-center gap-2"
                        title="Focus on this agent"
                      >
                        <Focus
                          size={10}
                          className="text-gray-400 hover:text-lavender-400 group-hover:scale-110 transition-all"
                        />
                        <span className="text-xs text-gray-400 group-hover:text-lavender-400 transition-all duration-200 hidden group-hover:block">
                          Focus
                        </span>
                      </button>
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {agent.model}
                    </span>
                  </div>
                </div>
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
                          size="sm"
                          agents={agentGroups}
                        />
                      )}
                      <div className="ml-auto">
                        <CopyButton text={agent.prompt} size="sm" />
                      </div>
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
                  <div className="flex gap-2">
                    <ModelAvatar model={agent.model} size="sm" />
                    <div className="flex-1">
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
                      <div className="flex gap-2">
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
                                  className="flex items-center gap-2 text-xs text-lavender-400/80 hover:text-lavender-300 transition-colors"
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
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {!agent.isStreaming &&
                      !agent.isComplete &&
                      !agent.response &&
                      !agent.streamedContent &&
                      !agent.error && (
                        <div className="flex gap-2">
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
                  <div className="flex gap-2">
                    <ModelAvatar model={agent.model} size="sm" />
                    <div className="flex-1">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-xs text-red-400 mb-1">Error</div>
                        <p className="text-red-300 text-sm">{agent.error}</p>
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
