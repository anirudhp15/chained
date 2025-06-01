"use client";

import { useMemo, useState } from "react";
import {
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChainStep {
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executionDuration?: number;
  estimatedCost?: number;
  model: string;
  isComplete?: boolean;
  wasSkipped?: boolean;
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

    return {
      totalTokens,
      totalDuration,
      totalCost,
      avgTokensPerSecond,
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

        <div className="grid grid-cols-4 gap-4">
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
    </div>
  );
}
