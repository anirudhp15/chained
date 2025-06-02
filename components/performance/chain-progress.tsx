"use client";

import React from "react";
import { SiOpenai, SiClaude } from "react-icons/si";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

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

interface AgentStep {
  _id: string;
  index: number;
  name?: string;
  model: string;
  isComplete: boolean;
  isStreaming: boolean;
  wasSkipped?: boolean;
  error?: string;
}

interface ChainProgressProps {
  agentSteps: AgentStep[];
  className?: string;
}

function getProviderIcon(model: string) {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("claude")) {
    return {
      Icon: SiClaude,
      color: "text-[#da7756]",
      bgColor: "bg-[#da7756]/10",
      borderColor: "border-[#da7756]/30",
    };
  } else if (modelLower.includes("grok") || modelLower.includes("xai")) {
    return {
      Icon: GrokIcon,
      color: "text-white",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/30",
    };
  } else {
    // Default to OpenAI
    return {
      Icon: SiOpenai,
      color: "text-white",
      bgColor: "bg-white/10",
      borderColor: "border-white/30",
    };
  }
}

function getStepStatus(step: AgentStep) {
  if (step.error) {
    return {
      status: "error" as const,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      StatusIcon: AlertCircle,
    };
  } else if (step.wasSkipped) {
    return {
      status: "skipped" as const,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/30",
      StatusIcon: null,
    };
  } else if (step.isComplete) {
    return {
      status: "complete" as const,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      StatusIcon: CheckCircle,
    };
  } else if (step.isStreaming) {
    return {
      status: "active" as const,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      StatusIcon: Clock,
    };
  } else {
    return {
      status: "pending" as const,
      color: "text-gray-500",
      bgColor: "bg-gray-600/10",
      borderColor: "border-gray-600/30",
      StatusIcon: null,
    };
  }
}

export function ChainProgress({
  agentSteps,
  className = "",
}: ChainProgressProps) {
  if (!agentSteps || agentSteps.length === 0) {
    return null;
  }

  // Sort steps by index to ensure correct order
  const sortedSteps = [...agentSteps].sort((a, b) => a.index - b.index);

  // Calculate progress
  const completedSteps = sortedSteps.filter(
    (step) => step.isComplete || step.wasSkipped
  ).length;
  const totalSteps = sortedSteps.length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          Chain Execution Progress
        </h3>
        <p className="text-sm text-gray-400">
          {completedSteps} of {totalSteps} agents completed
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="absolute inset-0 h-2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-full animate-pulse" />
      </div>

      {/* Agent Steps */}
      <div className="space-y-3">
        {sortedSteps.map((step, index) => {
          const provider = getProviderIcon(step.model);
          const status = getStepStatus(step);
          const isActive = status.status === "active";

          return (
            <div
              key={step._id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                status.bgColor
              } ${status.borderColor} ${isActive ? "animate-pulse" : ""}`}
            >
              {/* Step Number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                {index + 1}
              </div>

              {/* Provider Icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${provider.bgColor} ${provider.borderColor}`}
              >
                <provider.Icon size={16} className={provider.color} />
              </div>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {step.name || `Agent ${step.index + 1}`}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    {step.model}
                  </span>
                </div>
                {step.error && (
                  <p className="text-xs text-red-400 mt-1 truncate">
                    Error: {step.error}
                  </p>
                )}
                {step.wasSkipped && (
                  <p className="text-xs text-gray-400 mt-1">Skipped</p>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {status.StatusIcon && (
                  <status.StatusIcon
                    size={16}
                    className={`${status.color} ${
                      isActive ? "animate-spin" : ""
                    }`}
                  />
                )}
                {isActive && !status.StatusIcon && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full text-xs text-gray-400">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {progressPercentage === 100 ? "Chain Complete" : "Chain Running"}
        </div>
      </div>
    </div>
  );
}
