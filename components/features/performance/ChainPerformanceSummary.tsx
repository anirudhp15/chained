"use client";

import { useMemo, useState } from "react";
import {
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Timer,
  TrendingUp,
  Layers,
} from "lucide-react";

interface ChainStep {
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executionDuration?: number;
  estimatedCost?: number;
  firstTokenLatency?: number;
  tokensPerSecond?: number;
  connectionType?: string;
  model: string;
  isComplete?: boolean;
  wasSkipped?: boolean;
  name?: string;
  index?: number;
}

interface ChainPerformanceSummaryProps {
  steps: ChainStep[];
  className?: string;
}

export function ChainPerformanceSummary({
  steps,
  className = "",
}: ChainPerformanceSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = useMemo(() => {
    // Only include completed, non-skipped steps
    const completedSteps = steps.filter(
      (step) => step.isComplete && !step.wasSkipped
    );

    const totalTokens = completedSteps.reduce(
      (sum, step) => sum + (step.tokenUsage?.totalTokens || 0),
      0
    );

    const totalPromptTokens = completedSteps.reduce(
      (sum, step) => sum + (step.tokenUsage?.promptTokens || 0),
      0
    );

    const totalCompletionTokens = completedSteps.reduce(
      (sum, step) => sum + (step.tokenUsage?.completionTokens || 0),
      0
    );

    const totalDuration = completedSteps.reduce(
      (sum, step) => sum + (step.executionDuration || 0),
      0
    );

    const totalCost = completedSteps.reduce(
      (sum, step) => sum + (step.estimatedCost || 0),
      0
    );

    const avgTokensPerSecond =
      totalDuration > 0 ? totalTokens / (totalDuration / 1000) : 0;

    // First Token Latency - Average across all steps that have it
    const stepsWithLatency = completedSteps.filter(
      (step) => step.firstTokenLatency
    );
    const avgFirstTokenLatency =
      stepsWithLatency.length > 0
        ? stepsWithLatency.reduce(
            (sum, step) => sum + (step.firstTokenLatency || 0),
            0
          ) / stepsWithLatency.length
        : 0;

    // Token Efficiency Ratio - Output tokens / Input tokens
    const tokenEfficiencyRatio =
      totalPromptTokens > 0 ? totalCompletionTokens / totalPromptTokens : 0;

    // Parallel Execution Efficiency
    const parallelSteps = steps.filter(
      (step) => step.connectionType === "parallel"
    );
    const hasParallelExecution = parallelSteps.length > 0;

    let parallelEfficiency = 0;
    if (hasParallelExecution) {
      // Calculate theoretical sequential time vs actual parallel time
      const parallelGroupDurations = new Map<number, number[]>();

      // Group parallel steps by execution group (or just group them together)
      parallelSteps.forEach((step) => {
        if (step.executionDuration) {
          const groupKey = 0; // For now, treat all parallel steps as one group
          if (!parallelGroupDurations.has(groupKey)) {
            parallelGroupDurations.set(groupKey, []);
          }
          parallelGroupDurations.get(groupKey)!.push(step.executionDuration);
        }
      });

      // Calculate efficiency for each parallel group
      let totalSequentialTime = 0;
      let totalParallelTime = 0;

      parallelGroupDurations.forEach((durations) => {
        const sequentialTime = durations.reduce(
          (sum, duration) => sum + duration,
          0
        );
        const parallelTime = Math.max(...durations); // Parallel time is the longest step
        totalSequentialTime += sequentialTime;
        totalParallelTime += parallelTime;
      });

      if (totalParallelTime > 0) {
        parallelEfficiency =
          (totalSequentialTime - totalParallelTime) / totalSequentialTime;
      }
    }

    return {
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      totalDuration,
      totalCost,
      avgTokensPerSecond,
      avgFirstTokenLatency,
      tokenEfficiencyRatio,
      parallelEfficiency,
      hasParallelExecution,
      stepCount: completedSteps.length,
      totalSteps: steps.length,
      skippedSteps: steps.filter((step) => step.wasSkipped).length,
    };
  }, [steps]);

  if (steps.length === 0) return null;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.001) return `<$0.001`;
    return `$${cost.toFixed(4)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatRatio = (ratio: number) => {
    return `${ratio.toFixed(2)}x`;
  };

  const formatEfficiency = (efficiency: number) => {
    return `${Math.round(efficiency * 100)}%`;
  };

  return (
    <div
      className={`bg-gray-800/30 border border-gray-700/50 rounded-lg ${className}`}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-row justify-between p-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-lavender-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {steps.length === 1 ? "Agent Performance" : "Chain Performance"}
            </span>
            <span className="text-xs text-gray-400">
              {steps.length === 1
                ? steps[0].wasSkipped
                  ? "Agent was skipped"
                  : steps[0].isComplete
                    ? "Execution complete"
                    : "Execution in progress"
                : `(${summary.stepCount}/${summary.totalSteps} nodes completed${summary.skippedSteps > 0 ? `, ${summary.skippedSteps} skipped` : ""})`}
            </span>
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Zap size={12} />
              <span className="text-xs">Total Tokens</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {summary.totalTokens.toLocaleString()}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Clock size={12} />
              <span className="text-xs">Total Time</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {formatDuration(summary.totalDuration)}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <DollarSign size={12} />
              <span className="text-xs">Total Cost</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {formatCost(summary.totalCost)}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <BarChart3 size={12} />
              <span className="text-xs">Avg Speed</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {summary.avgTokensPerSecond.toFixed(1)}/s
            </div>
          </div>

          {/* First Token Latency */}
          {summary.avgFirstTokenLatency > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                <Timer size={12} />
                <span className="text-xs">First Token</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {formatLatency(summary.avgFirstTokenLatency)}
              </div>
            </div>
          )}

          {/* Token Efficiency Ratio */}
          {summary.tokenEfficiencyRatio > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                <TrendingUp size={12} />
                <span className="text-xs">Efficiency</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {formatRatio(summary.tokenEfficiencyRatio)}
              </div>
            </div>
          )}

          {/* Parallel Execution Efficiency */}
          {summary.hasParallelExecution && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                <Layers size={12} />
                <span className="text-xs">Time Saved</span>
              </div>
              <div className="text-lg font-semibold text-purple-400">
                {formatEfficiency(summary.parallelEfficiency)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout - Collapsible */}
      <div className="md:hidden">
        {/* Mobile Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2 ml-12">
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-white">
                {steps.length === 1 ? "Agent Performance" : "Chain Performance"}
              </span>
              <span className="text-xs text-gray-400">
                {summary.totalTokens.toLocaleString()} •{" "}
                {formatDuration(summary.totalDuration)} •{" "}
                {formatCost(summary.totalCost)}
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>

        {/* Mobile Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-700/50 p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Zap size={10} />
                  <span className="text-xs">Tokens</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {summary.totalTokens.toLocaleString()}
                </div>
              </div>

              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Clock size={10} />
                  <span className="text-xs">Time</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {formatDuration(summary.totalDuration)}
                </div>
              </div>

              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <DollarSign size={10} />
                  <span className="text-xs">Cost</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {formatCost(summary.totalCost)}
                </div>
              </div>

              <div className="text-center bg-gray-800/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <BarChart3 size={10} />
                  <span className="text-xs">Speed</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {summary.avgTokensPerSecond.toFixed(1)}/s
                </div>
              </div>

              {/* First Token Latency */}
              {summary.avgFirstTokenLatency > 0 && (
                <div className="text-center bg-gray-800/50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Timer size={10} />
                    <span className="text-xs">First Token</span>
                  </div>
                  <div className="text-sm font-semibold text-blue-400">
                    {formatLatency(summary.avgFirstTokenLatency)}
                  </div>
                </div>
              )}

              {/* Token Efficiency Ratio */}
              {summary.tokenEfficiencyRatio > 0 && (
                <div className="text-center bg-gray-800/50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <TrendingUp size={10} />
                    <span className="text-xs">Efficiency</span>
                  </div>
                  <div className="text-sm font-semibold text-green-400">
                    {formatRatio(summary.tokenEfficiencyRatio)}
                  </div>
                </div>
              )}

              {/* Parallel Execution Efficiency */}
              {summary.hasParallelExecution && (
                <div className="text-center bg-gray-800/50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Layers size={10} />
                    <span className="text-xs">Parallel Saved</span>
                  </div>
                  <div className="text-sm font-semibold text-purple-400">
                    {formatEfficiency(summary.parallelEfficiency)}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Status */}
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-400">
                {steps.length === 1
                  ? steps[0].wasSkipped
                    ? "Agent was skipped"
                    : steps[0].isComplete
                      ? "Execution complete"
                      : "Execution in progress"
                  : `${summary.stepCount}/${summary.totalSteps} nodes completed${summary.skippedSteps > 0 ? `, ${summary.skippedSteps} skipped` : ""}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* {summary.totalTokens > 0 && (
        <div className="border-t border-gray-700/50">
          <details className="group" open>
            <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-400" />
                <span className="text-sm text-gray-300">
                  Token Distribution
                </span>
              </div>
              <ChevronDown
                size={14}
                className="text-gray-400 group-open:rotate-180 transition-transform"
              />
            </summary>

            <div className="p-3 pt-0 pb-4 space-y-3 bg-gray-900/20 rounded-b-lg">
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Per Agent</div>
                {steps
                  .filter((step) => step.isComplete && !step.wasSkipped)
                  .map((step, index) => {
                    // Handle both detailed tokenUsage and basic totalTokens
                    const hasDetailedTokens =
                      step.tokenUsage?.promptTokens &&
                      step.tokenUsage?.completionTokens;
                    const totalTokens = step.tokenUsage?.totalTokens || 0;

                    if (totalTokens === 0) return null;

                    return (
                      <div key={index} className="bg-gray-900/50 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-200">
                            {step.name || `Agent ${(step.index || index) + 1}`}
                          </span>
                          <span className="text-xs text-gray-400">
                            {totalTokens.toLocaleString()} total
                          </span>
                        </div>
                        {hasDetailedTokens ? (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-blue-400">
                              {step.tokenUsage!.promptTokens.toLocaleString()}{" "}
                              in
                            </span>
                            <span className="text-green-400">
                              {step.tokenUsage!.completionTokens.toLocaleString()}{" "}
                              out
                            </span>
                            <span className="text-gray-500">
                              {(
                                step.tokenUsage!.completionTokens /
                                step.tokenUsage!.promptTokens
                              ).toFixed(2)}
                              x
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            Detailed breakdown not available
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {summary.totalPromptTokens > 0 &&
                summary.totalCompletionTokens > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Total Distribution
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-400 rounded"></div>
                        <span className="text-xs text-gray-300">
                          Input: {summary.totalPromptTokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded"></div>
                        <span className="text-xs text-gray-300">
                          Output:{" "}
                          {summary.totalCompletionTokens.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex rounded-full overflow-hidden h-2 bg-gray-700">
                      <div
                        className="bg-blue-400 h-full"
                        style={{
                          width: `${(summary.totalPromptTokens / summary.totalTokens) * 100}%`,
                        }}
                      ></div>
                      <div
                        className="bg-green-400 h-full"
                        style={{
                          width: `${(summary.totalCompletionTokens / summary.totalTokens) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
            </div>
          </details>
        </div>
      )} */}
    </div>
  );
}
