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
} from "lucide-react";
import { useState, useMemo, useRef, useCallback } from "react";
import { ModelAvatar } from "./model-avatar";
import { MarkdownRenderer } from "./markdown-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { ConnectionBadge } from "./connection-selector";

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

  // Column resize state
  const [columnStates, setColumnStates] = useState<ColumnState[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeColumnIndex, setResizeColumnIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastUpdateTime = useRef<number>(0);

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
          provider: step.provider,
          response: null,
          streamedContent: null,
          isStreaming: false,
          reasoning: null,
          tokenUsage: null,
          error: null,
          isComplete: false,
          _id: step._id,
          wasSkipped: false,
          skipReason: null,
          connectionType: null,
          connectionCondition: null,
        });
      }

      const agent = stepsByAgent.get(step.index);
      agent.response = step.response;
      agent.streamedContent = step.streamedContent;
      agent.isStreaming = step.isStreaming;
      agent.reasoning = step.reasoning;
      agent.tokenUsage = step.tokenUsage;
      agent.error = step.error;
      agent.isComplete = step.isComplete;
      agent.wasSkipped = step.wasSkipped || false;
      agent.skipReason = step.skipReason;
      agent.connectionType = step.connectionType;
      agent.connectionCondition = step.connectionCondition;
    });

    const groups = Array.from(stepsByAgent.values()).sort(
      (a, b) => a.index - b.index
    );

    // Initialize column states if needed
    if (columnStates.length !== groups.length) {
      const equalWidth = 100 / Math.max(groups.length, 1);
      setColumnStates(
        groups.map(() => ({
          width: equalWidth,
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

  // Handle resize start

  // Handle resize move with throttling and RAF optimization
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current || resizeColumnIndex === -1)
        return;

      // Throttle updates to every 16ms (60fps)
      const now = Date.now();
      if (now - lastUpdateTime.current < 16) return;
      lastUpdateTime.current = now;

      // Cancel previous RAF if still pending
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use RAF for smooth updates
      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.getBoundingClientRect().width;
        const deltaX = e.clientX - resizeStartX;
        const deltaPercent = (deltaX / containerWidth) * 100;

        setColumnStates((prev) => {
          const newStates = [...prev];
          const currentColumn = newStates[resizeColumnIndex];
          const nextColumn = newStates[resizeColumnIndex + 1];

          if (!currentColumn || !nextColumn) return prev;

          // Calculate new widths with bounds checking
          const minWidth = 3; // Minimum width percentage
          const maxWidth = 95; // Maximum width percentage

          const newCurrentWidth = Math.max(
            minWidth,
            Math.min(maxWidth, currentColumn.width + deltaPercent)
          );
          const newNextWidth = Math.max(
            minWidth,
            Math.min(maxWidth, nextColumn.width - deltaPercent)
          );

          // Only update if the change is significant enough (reduces unnecessary updates)
          const threshold = 0.5; // percentage
          if (
            Math.abs(newCurrentWidth - currentColumn.width) < threshold &&
            Math.abs(newNextWidth - nextColumn.width) < threshold
          ) {
            return prev;
          }

          // Check for collapse threshold
          const collapseThreshold = 8;

          newStates[resizeColumnIndex] = {
            ...currentColumn,
            width: newCurrentWidth,
            isCollapsed: newCurrentWidth < collapseThreshold,
          };

          newStates[resizeColumnIndex + 1] = {
            ...nextColumn,
            width: newNextWidth,
            isCollapsed: newNextWidth < collapseThreshold,
          };

          return newStates;
        });

        setResizeStartX(e.clientX);
      });
    },
    [isResizing, resizeStartX, resizeColumnIndex]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeColumnIndex(-1);

    // Re-enable transitions after drag ends
    if (containerRef.current) {
      containerRef.current.style.removeProperty("--disable-transitions");
    }

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  // Mouse event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove, {
        passive: false,
      });
      document.addEventListener("mouseup", handleResizeEnd);

      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);

        // Cleanup RAF on unmount
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Toggle collapse state
  const toggleCollapse = useCallback((columnIndex: number) => {
    setColumnStates((prev) => {
      const newStates = [...prev];
      const column = newStates[columnIndex];

      if (column.isCollapsed) {
        // Expand: give it a reasonable width
        const availableWidth =
          100 -
          newStates.reduce(
            (sum, state, idx) =>
              idx !== columnIndex && !state.isCollapsed
                ? sum + state.width
                : sum,
            0
          );
        column.width = Math.max(25, availableWidth / 2);
        column.isCollapsed = false;
      } else {
        // Collapse: set to minimal width
        column.width = 3;
        column.isCollapsed = true;
      }

      return newStates;
    });
  }, []);

  if (!sessionId) {
    return (
      <div className="h-full overflow-y-auto px-4 flex items-center">
        <div className="max-w-6xl w-full mx-auto">
          <WelcomeScreen onLoadPreset={onLoadPreset || (() => {})} />
        </div>
      </div>
    );
  }

  const toggleReasoning = (stepId: string) => {
    setExpandedReasoning(expandedReasoning === stepId ? null : stepId);
  };

  // Focus Mode View
  if (focusedAgent !== null) {
    return (
      <div className="h-full flex flex-col">
        {/* Focus Mode Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ModelAvatar model={focusedAgent.model} size="sm" />
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">
                  {focusedAgent.model}
                </span>
                <span className="text-gray-400 text-xs">
                  Agent {focusedAgent.index + 1} • Focus
                </span>
              </div>
            </div>
            <button
              onClick={() => handleFocusToggle(focusedAgent.index)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 rounded-lg text-gray-300 hover:text-white transition-all group"
            >
              <Grid3X3
                size={14}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="text-sm">Exit Focus</span>
            </button>
          </div>
        </div>

        {/* Focused Agent Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {/* User Prompt */}
            <div className="w-full">
              <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl px-6 py-4">
                <div className="flex flex-row gap-3">
                  <span className="text-sm text-lavender-400/80 font-medium">
                    Prompt
                  </span>
                  {focusedAgent.connectionType && focusedAgent.index > 0 && (
                    <ConnectionBadge
                      type={focusedAgent.connectionType}
                      sourceAgentIndex={focusedAgent.index - 1}
                      condition={focusedAgent.connectionCondition}
                    />
                  )}
                </div>
                <p className="text-white text-base leading-relaxed">
                  {focusedAgent.prompt}
                </p>
              </div>
            </div>

            {/* Skipped Agent State */}
            {focusedAgent.wasSkipped && (
              <div className="flex gap-4">
                <ModelAvatar model={focusedAgent.model} size="sm" />
                <div className="flex-1">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="text-sm text-orange-400 mb-2 flex items-center gap-2">
                      <span>Skipped</span>
                      <span className="font-mono">→?</span>
                    </div>
                    <p className="text-orange-300 text-base">
                      {focusedAgent.skipReason ||
                        "Agent was skipped due to conditional logic"}
                    </p>
                    {focusedAgent.connectionCondition && (
                      <div className="mt-3 text-sm text-orange-400/70">
                        Condition:{" "}
                        <span className="font-mono">
                          {focusedAgent.connectionCondition}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Agent Response */}
            {!focusedAgent.wasSkipped &&
              (focusedAgent.response ||
                focusedAgent.streamedContent ||
                focusedAgent.isStreaming) && (
                <div className="flex gap-4">
                  <ModelAvatar model={focusedAgent.model} size="sm" />
                  <div className="flex-1">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-lavender-400/80 mb-3 flex items-center justify-between">
                        <span>Response</span>
                        <div className="flex items-center gap-3">
                          {focusedAgent.isStreaming && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
                              <span className="text-sm">Streaming...</span>
                            </div>
                          )}
                          {focusedAgent.tokenUsage && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Zap size={12} />
                              <span>{focusedAgent.tokenUsage.totalTokens}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Main Response */}
                      <div className="text-white text-base">
                        <MarkdownRenderer
                          content={
                            focusedAgent.response ||
                            focusedAgent.streamedContent ||
                            ""
                          }
                          isStreaming={focusedAgent.isStreaming}
                        />
                        {focusedAgent.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-lavender-400 ml-1 streaming-cursor"></span>
                        )}
                      </div>

                      {/* Reasoning Panel */}
                      {focusedAgent.reasoning && (
                        <div className="mt-4 border-t border-gray-600/50 pt-4">
                          <button
                            onClick={() => toggleReasoning(focusedAgent._id)}
                            className="flex items-center gap-2 text-sm text-lavender-400/80 hover:text-lavender-300 transition-colors"
                          >
                            {expandedReasoning === focusedAgent._id ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                            <span>Reasoning</span>
                          </button>

                          {expandedReasoning === focusedAgent._id && (
                            <div className="mt-3 p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 animate-in slide-in-from-top-2 duration-200">
                              <div className="text-sm text-gray-400 mb-3">
                                Model Reasoning:
                              </div>
                              <div className="text-base text-gray-300">
                                <MarkdownRenderer
                                  content={focusedAgent.reasoning}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Token Usage Details */}
                      {focusedAgent.tokenUsage &&
                        expandedReasoning === focusedAgent._id && (
                          <div className="mt-3 p-3 bg-gray-900/30 rounded-lg text-sm text-gray-400">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                Input: {focusedAgent.tokenUsage.promptTokens}
                              </div>
                              <div>
                                Output:{" "}
                                {focusedAgent.tokenUsage.completionTokens}
                              </div>
                              <div>
                                Total: {focusedAgent.tokenUsage.totalTokens}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

            {/* Error State */}
            {!focusedAgent.wasSkipped && focusedAgent.error && (
              <div className="flex gap-4">
                <ModelAvatar model={focusedAgent.model} size="sm" />
                <div className="flex-1">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="text-sm text-red-400 mb-2">Error</div>
                    <p className="text-red-300 text-base">
                      {focusedAgent.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {!focusedAgent.wasSkipped &&
              !focusedAgent.isComplete &&
              !focusedAgent.response &&
              !focusedAgent.streamedContent &&
              !focusedAgent.error && (
                <div className="flex gap-4">
                  <ModelAvatar model={focusedAgent.model} size="sm" />
                  <div className="flex-1">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-lavender-400/80 mb-3">
                        Thinking...
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  // Multi-Agent Chain View
  return (
    <div
      ref={containerRef}
      className="flex-1 flex overflow-hidden bg-black w-full relative"
      style={
        {
          "--disable-transitions": isResizing ? "1" : "0",
        } as React.CSSProperties
      }
    >
      {focusedAgent ? (
        // Focused agent view
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Focus Mode Header */}
          <div className="flex-shrink-0 px-4 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ModelAvatar model={focusedAgent.model} size="sm" />
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">
                    {focusedAgent.model}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Agent {focusedAgent.index + 1} • Focus
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleFocusToggle(focusedAgent.index)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 rounded-lg text-gray-300 hover:text-white transition-all group"
              >
                <Grid3X3
                  size={14}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-sm">Exit Focus</span>
              </button>
            </div>
          </div>

          {/* Focused Agent Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
              {/* User Prompt */}
              <div className="w-full">
                <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl px-6 py-4">
                  <div className="flex flex-row gap-3">
                    <span className="text-sm text-lavender-400/80 font-medium">
                      Prompt
                    </span>
                    {focusedAgent.connectionType && focusedAgent.index > 0 && (
                      <ConnectionBadge
                        type={focusedAgent.connectionType}
                        sourceAgentIndex={focusedAgent.index - 1}
                        condition={focusedAgent.connectionCondition}
                      />
                    )}
                  </div>
                  <p className="text-white text-base leading-relaxed">
                    {focusedAgent.prompt}
                  </p>
                </div>
              </div>

              {/* Skipped Agent State */}
              {focusedAgent.wasSkipped && (
                <div className="flex gap-4">
                  <ModelAvatar model={focusedAgent.model} size="sm" />
                  <div className="flex-1">
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                      <div className="text-sm text-orange-400 mb-2 flex items-center gap-2">
                        <span>Skipped</span>
                        <span className="font-mono">→?</span>
                      </div>
                      <p className="text-orange-300 text-base">
                        {focusedAgent.skipReason ||
                          "Agent was skipped due to conditional logic"}
                      </p>
                      {focusedAgent.connectionCondition && (
                        <div className="mt-3 text-sm text-orange-400/70">
                          Condition:{" "}
                          <span className="font-mono">
                            {focusedAgent.connectionCondition}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Response */}
              {!focusedAgent.wasSkipped &&
                (focusedAgent.response ||
                  focusedAgent.streamedContent ||
                  focusedAgent.isStreaming) && (
                  <div className="flex gap-4">
                    <ModelAvatar model={focusedAgent.model} size="sm" />
                    <div className="flex-1">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                        <div className="text-sm text-lavender-400/80 mb-3 flex items-center justify-between">
                          <span>Response</span>
                          <div className="flex items-center gap-3">
                            {focusedAgent.isStreaming && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
                                <span className="text-sm">Streaming...</span>
                              </div>
                            )}
                            {focusedAgent.tokenUsage && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Zap size={12} />
                                <span>
                                  {focusedAgent.tokenUsage.totalTokens}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Main Response */}
                        <div className="text-white text-base">
                          <MarkdownRenderer
                            content={
                              focusedAgent.response ||
                              focusedAgent.streamedContent ||
                              ""
                            }
                            isStreaming={focusedAgent.isStreaming}
                          />
                          {focusedAgent.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-lavender-400 ml-1 streaming-cursor"></span>
                          )}
                        </div>

                        {/* Reasoning Panel */}
                        {focusedAgent.reasoning && (
                          <div className="mt-4 border-t border-gray-600/50 pt-4">
                            <button
                              onClick={() => toggleReasoning(focusedAgent._id)}
                              className="flex items-center gap-2 text-sm text-lavender-400/80 hover:text-lavender-300 transition-colors"
                            >
                              {expandedReasoning === focusedAgent._id ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                              <span>Reasoning</span>
                            </button>

                            {expandedReasoning === focusedAgent._id && (
                              <div className="mt-3 p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 animate-in slide-in-from-top-2 duration-200">
                                <div className="text-sm text-gray-400 mb-3">
                                  Model Reasoning:
                                </div>
                                <div className="text-base text-gray-300">
                                  <MarkdownRenderer
                                    content={focusedAgent.reasoning}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Token Usage Details */}
                        {focusedAgent.tokenUsage &&
                          expandedReasoning === focusedAgent._id && (
                            <div className="mt-3 p-3 bg-gray-900/30 rounded-lg text-sm text-gray-400">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  Input: {focusedAgent.tokenUsage.promptTokens}
                                </div>
                                <div>
                                  Output:{" "}
                                  {focusedAgent.tokenUsage.completionTokens}
                                </div>
                                <div>
                                  Total: {focusedAgent.tokenUsage.totalTokens}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Error State */}
              {!focusedAgent.wasSkipped && focusedAgent.error && (
                <div className="flex gap-4">
                  <ModelAvatar model={focusedAgent.model} size="sm" />
                  <div className="flex-1">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <div className="text-sm text-red-400 mb-2">Error</div>
                      <p className="text-red-300 text-base">
                        {focusedAgent.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {!focusedAgent.wasSkipped &&
                !focusedAgent.isComplete &&
                !focusedAgent.response &&
                !focusedAgent.streamedContent &&
                !focusedAgent.error && (
                  <div className="flex gap-4">
                    <ModelAvatar model={focusedAgent.model} size="sm" />
                    <div className="flex-1">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                        <div className="text-sm text-lavender-400/80 mb-3">
                          Thinking...
                        </div>
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse delay-75"></div>
                          <div className="w-2 h-2 bg-lavender-400 rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : (
        // Multi-agent view
        <div className="flex-1 flex overflow-hidden">
          {agentGroups.map((agent, index) => (
            <div
              key={agent._id}
              className={`agent-container flex flex-col overflow-hidden ${
                columnStates[index]?.isCollapsed ? "collapsed-column" : ""
              }`}
              style={{
                width: `${columnStates[index]?.width || 100}%`,
                minWidth: columnStates[index]?.isCollapsed ? "40px" : "200px",
                maxWidth: columnStates[index]?.isCollapsed ? "40px" : "none",
              }}
            >
              {/* Agent Column */}
              <div className="h-full flex flex-col">
                {columnStates[index]?.isCollapsed ? (
                  /* Collapsed State */
                  <div className="h-full bg-gray-900/50 border-r border-gray-700/30 flex flex-col">
                    {/* Collapsed Header */}
                    <div className="p-2 border-b border-gray-700/30 bg-gray-950/95">
                      <button
                        onClick={() => toggleCollapse(index)}
                        className="w-full flex flex-col items-center gap-1 hover:bg-gray-800/50 rounded p-1 transition-colors group"
                      >
                        <ModelAvatar model={agent.model} size="xs" />
                        <div className="w-px h-2 bg-lavender-400/60"></div>
                        <span className="text-lavender-400/80 text-xs font-mono writing-mode-vertical text-orientation-mixed transform rotate-90">
                          {agent.index + 1}
                        </span>
                        <ChevronRight
                          size={10}
                          className="text-gray-400 group-hover:text-lavender-400 transition-colors mt-1"
                        />
                      </button>
                    </div>

                    {/* Collapsed Content Indicators */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-2">
                      {/* Prompt Indicator */}
                      <div className="w-2 h-6 bg-gray-600 rounded-full"></div>

                      {/* Response Indicator */}
                      {(agent.response ||
                        agent.streamedContent ||
                        agent.isStreaming) && (
                        <div className="w-2 h-12 bg-lavender-400/40 rounded-full"></div>
                      )}

                      {/* Streaming Indicator */}
                      {agent.isStreaming && (
                        <div className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"></div>
                      )}

                      {/* Error Indicator */}
                      {agent.error && (
                        <div className="w-2 h-4 bg-red-400/60 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Expanded State */
                  <>
                    {/* Agent Header */}
                    <div className="agent-header flex-shrink-0 px-3 py-3 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ModelAvatar model={agent.model} size="xs" />
                          <div className="flex flex-col">
                            <span className="text-white font-medium text-xs">
                              {agent.model}
                            </span>
                            {agent.provider && (
                              <span className="text-gray-400 text-xs">
                                {agent.provider}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFocusToggle(agent.index)}
                            className="p-1 hover:bg-gray-800/50 rounded transition-colors group"
                            title="Focus on this agent"
                          >
                            <Focus
                              size={10}
                              className="text-gray-400 hover:text-lavender-400 group-hover:scale-110 transition-all"
                            />
                          </button>
                          <button
                            onClick={() => toggleCollapse(agent.index)}
                            className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                          >
                            <ChevronLeft
                              size={10}
                              className="text-gray-400 hover:text-lavender-400"
                            />
                          </button>
                          <div className="w-1.5 h-1.5 bg-lavender-400/60 rounded-full"></div>
                          <span className="text-lavender-400/80 text-xs font-mono">
                            {agent.index + 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Agent Content - Individually Scrollable */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 agent-content">
                      {/* User Prompt */}
                      <div className="w-full px-0.5">
                        <div className="bg-gray-800/90 border border-gray-700/50 rounded-lg px-4 py-3">
                          <div className="flex flex-row items-center gap-2">
                            <span className="text-xs text-lavender-400/80 font-medium">
                              Prompt
                            </span>
                            {agent.connectionType && agent.index > 0 && (
                              <ConnectionBadge
                                type={agent.connectionType}
                                sourceAgentIndex={agent.index - 1}
                                condition={agent.connectionCondition}
                                size="sm"
                              />
                            )}
                          </div>
                          <p className="text-white text-sm leading-relaxed">
                            {agent.prompt}
                          </p>
                        </div>
                      </div>

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

                      {/* Agent Response */}
                      {!agent.wasSkipped &&
                        (agent.response ||
                          agent.streamedContent ||
                          agent.isStreaming) && (
                          <div className="flex gap-2">
                            <ModelAvatar model={agent.model} size="sm" />
                            <div className="flex-1">
                              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                                <div className="text-xs text-lavender-400/80 mb-1 flex items-center justify-between">
                                  <span>Response</span>
                                  <div className="flex items-center gap-2">
                                    {agent.isStreaming && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-lavender-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs">
                                          Streaming...
                                        </span>
                                      </div>
                                    )}
                                    {agent.tokenUsage && (
                                      <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Zap size={10} />
                                        <span className="text-xs">
                                          {agent.tokenUsage.totalTokens}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Main Response */}
                                <div className="text-white text-sm">
                                  <MarkdownRenderer
                                    content={
                                      agent.response ||
                                      agent.streamedContent ||
                                      ""
                                    }
                                    isStreaming={agent.isStreaming}
                                  />
                                  {agent.isStreaming && (
                                    <span className="inline-block w-1.5 h-3 bg-lavender-400 ml-1 streaming-cursor"></span>
                                  )}
                                </div>

                                {/* Reasoning Panel */}
                                {agent.reasoning && (
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
                                      <div className="mt-2 p-3 bg-gray-900/50 rounded border border-gray-600/50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="text-xs text-gray-400 mb-2">
                                          Model Reasoning:
                                        </div>
                                        <div className="text-sm text-gray-300">
                                          <MarkdownRenderer
                                            content={agent.reasoning}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Token Usage Details */}
                                {agent.tokenUsage &&
                                  expandedReasoning === agent._id && (
                                    <div className="mt-2 p-2 bg-gray-900/30 rounded text-xs text-gray-400">
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                          In: {agent.tokenUsage.promptTokens}
                                        </div>
                                        <div>
                                          Out:{" "}
                                          {agent.tokenUsage.completionTokens}
                                        </div>
                                        <div>
                                          Total: {agent.tokenUsage.totalTokens}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Error State */}
                      {!agent.wasSkipped && agent.error && (
                        <div className="flex gap-2">
                          <ModelAvatar model={agent.model} size="sm" />
                          <div className="flex-1">
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                              <div className="text-xs text-red-400 mb-1">
                                Error
                              </div>
                              <p className="text-red-300 text-sm">
                                {agent.error}
                              </p>
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
                          <div className="flex gap-2">
                            <ModelAvatar model={agent.model} size="sm" />
                            <div className="flex-1">
                              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                                <div className="text-xs text-lavender-400/80 mb-1">
                                  Thinking...
                                </div>
                                <div className="flex space-x-1">
                                  <div className="w-1.5 h-1.5 bg-lavender-400 rounded-full animate-pulse"></div>
                                  <div className="w-1.5 h-1.5 bg-lavender-400 rounded-full animate-pulse delay-75"></div>
                                  <div className="w-1.5 h-1.5 bg-lavender-400 rounded-full animate-pulse delay-150"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
