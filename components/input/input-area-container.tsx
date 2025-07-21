"use client";

import { useState, useEffect } from "react";
import { InitialChainInput } from "./initial-chain-input";
import { FocusedAgentInput } from "./focused-agent-input";
import type { Agent } from "../core/agent-input";
import type { Id } from "../../convex/_generated/dataModel";

export type InputMode = "initial" | "focused" | "supervisor";

interface InputAreaContainerProps {
  mode: InputMode;
  sessionId?: Id<"chatSessions"> | null;

  // Initial chain mode props
  onSendChain?: (agents: Agent[]) => void;
  presetAgents?: Agent[] | null;
  onClearPresetAgents?: () => void;

  // Focused agent mode props
  focusedAgentIndex?: number | null;
  focusedAgent?: Agent | null;
  onSendFocusedAgent?: (agent: Agent) => void;

  // Supervisor mode props (kept for backward compatibility but not used)
  onSupervisorSend?: (message: string) => void;
  onSupervisorTyping?: (isTyping: boolean) => void;
  agentSteps?: any[];

  // Common props
  isLoading?: boolean;
  isStreaming?: boolean;
  queuedAgents?: Agent[];
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

export function InputAreaContainer({
  mode,
  sessionId,
  onSendChain,
  presetAgents,
  onClearPresetAgents,
  focusedAgentIndex,
  focusedAgent,
  onSendFocusedAgent,
  onSupervisorSend,
  onSupervisorTyping,
  agentSteps = [],
  isLoading = false,
  isStreaming = false,
  queuedAgents = [],
  agents,
  setAgents,
}: InputAreaContainerProps) {
  // Render the appropriate input component based on mode
  switch (mode) {
    case "initial":
      return (
        <InitialChainInput
          onSendChain={onSendChain!}
          isLoading={isLoading}
          isStreaming={isStreaming}
          queuedAgents={queuedAgents}
          presetAgents={presetAgents}
          onClearPresetAgents={onClearPresetAgents}
          agents={agents}
          setAgents={setAgents}
        />
      );

    case "focused":
      if (
        focusedAgentIndex === null ||
        focusedAgentIndex === undefined ||
        !focusedAgent
      ) {
        return null;
      }
      return (
        <FocusedAgentInput
          focusedAgentIndex={focusedAgentIndex}
          focusedAgent={focusedAgent}
          onSendFocusedAgent={onSendFocusedAgent!}
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
      );

    case "supervisor":
      // Supervisor mode is now handled by SupervisorInterface component
      // This case is kept for backward compatibility but returns null
      return null;

    default:
      return null;
  }
}
