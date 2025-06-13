"use client";

import React from "react";

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

export function ChainProgress({
  agentSteps,
  className = "",
}: ChainProgressProps) {
  if (!agentSteps || agentSteps.length === 0) {
    return null;
  }

  // Sort steps by index to ensure correct order
  const sortedSteps = [...agentSteps].sort((a, b) => a.index - b.index);

  // Find the currently active step
  const currentStepIndex = sortedSteps.findIndex((step) => step.isStreaming);
  const activeStep =
    currentStepIndex >= 0 ? sortedSteps[currentStepIndex] : null;

  // Calculate completion status
  const completedCount = sortedSteps.filter(
    (s) => s.isComplete || s.wasSkipped
  ).length;
  const hasErrors = sortedSteps.some((s) => s.error);
  const isComplete = completedCount === sortedSteps.length;

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {sortedSteps.map((step, index) => {
          const isActive = step.isStreaming;
          const isComplete = step.isComplete || step.wasSkipped;
          const hasError = !!step.error;

          return (
            <div
              key={step._id}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                hasError
                  ? "bg-red-400"
                  : isActive
                    ? "bg-blue-400 animate-pulse scale-125"
                    : isComplete
                      ? "bg-emerald-400"
                      : "bg-gray-600"
              }`}
            />
          );
        })}
      </div>

      {/* Current step info */}
      <div className="text-center">
        {activeStep ? (
          <span className="text-xs text-gray-400 font-medium">
            {activeStep.name || `Agent ${activeStep.index + 1}`}
          </span>
        ) : hasErrors ? (
          <span className="text-xs text-red-400 font-medium">
            Chain execution failed
          </span>
        ) : isComplete ? (
          <span className="text-xs text-emerald-400 font-medium">
            Chain complete
          </span>
        ) : (
          <span className="text-xs text-gray-500 font-medium">
            Chain pending
          </span>
        )}
        <div className="text-xs text-gray-500 mt-1">
          {completedCount} of {sortedSteps.length} agents
        </div>
      </div>
    </div>
  );
}
