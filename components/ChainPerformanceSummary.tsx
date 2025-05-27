"use client";

import { useMemo } from "react";
import { Zap, Clock, DollarSign, BarChart3 } from "lucide-react";

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
      className={`bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-lavender-400" />
        <span className="text-sm font-medium text-white">
          Chain Performance
        </span>
        <span className="text-xs text-gray-400">
          ({summary.stepCount}/{summary.totalSteps} completed
          {summary.skippedSteps > 0 && `, ${summary.skippedSteps} skipped`})
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  );
}
