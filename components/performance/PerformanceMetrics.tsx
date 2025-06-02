"use client";

import { useState } from "react";
import {
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PerformanceMetricsProps {
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executionDuration?: number;
  tokensPerSecond?: number;
  estimatedCost?: number;
  model: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function PerformanceMetrics({
  tokenUsage,
  executionDuration,
  tokensPerSecond,
  estimatedCost,
  model,
  size = "sm",
  showDetails = false,
}: PerformanceMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  if (!tokenUsage && !executionDuration) return null;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.001) return `<$0.001`;
    return `$${cost.toFixed(4)}`;
  };

  const getEfficiencyColor = (tokensPerSec: number) => {
    if (tokensPerSec > 50) return "text-green-400";
    if (tokensPerSec > 20) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
      {/* Summary Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {tokenUsage && (
            <div className="flex items-center gap-1 text-gray-400">
              <Zap size={size === "sm" ? 12 : 14} />
              <span className={`${size === "sm" ? "text-xs" : "text-sm"}`}>
                {tokenUsage.totalTokens}
              </span>
            </div>
          )}

          {executionDuration && (
            <div className="flex items-center gap-1 text-gray-400">
              <Clock size={size === "sm" ? 12 : 14} />
              <span className={`${size === "sm" ? "text-xs" : "text-sm"}`}>
                {formatDuration(executionDuration)}
              </span>
            </div>
          )}

          {estimatedCost && (
            <div className="flex items-center gap-1 text-gray-400">
              <DollarSign size={size === "sm" ? 12 : 14} />
              <span className={`${size === "sm" ? "text-xs" : "text-sm"}`}>
                {formatCost(estimatedCost)}
              </span>
            </div>
          )}

          {tokensPerSecond && (
            <div
              className={`flex items-center gap-1 ${getEfficiencyColor(tokensPerSecond)}`}
            >
              <TrendingUp size={size === "sm" ? 12 : 14} />
              <span className={`${size === "sm" ? "text-xs" : "text-sm"}`}>
                {tokensPerSecond.toFixed(1)}/s
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Detailed View */}
      {isExpanded && tokenUsage && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
            <div>
              <span className="text-gray-500">Input:</span>{" "}
              {tokenUsage.promptTokens}
            </div>
            <div>
              <span className="text-gray-500">Output:</span>{" "}
              {tokenUsage.completionTokens}
            </div>
            <div>
              <span className="text-gray-500">Model:</span> {model}
            </div>
            <div>
              <span className="text-gray-500">Efficiency:</span>
              <span className={getEfficiencyColor(tokensPerSecond || 0)}>
                {tokensPerSecond
                  ? ` ${tokensPerSecond.toFixed(1)} tok/s`
                  : " N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
