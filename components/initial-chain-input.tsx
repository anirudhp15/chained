"use client";

import { useState, useEffect } from "react";
import { AgentInput, type Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";
import { CONNECTION_TYPES, DEFAULT_AGENT_CONFIG } from "@/lib/constants";

// Simple connection icon component
const ConnectionIcon = ({ connectionType }: { connectionType?: string }) => {
  const connectionConfig =
    CONNECTION_TYPES.find((c) => c.type === connectionType) ||
    CONNECTION_TYPES[0];
  const IconComponent = connectionConfig.Icon;

  return (
    <div className="flex items-center justify-center px-2">
      <div className="flex items-center gap-2">
        <div className="">
          <IconComponent
            size={24}
            className={`${connectionConfig.color} ${connectionConfig.iconRotate || ""}`}
          />
        </div>
      </div>
    </div>
  );
};

interface InitialChainInputProps {
  onSendChain: (agents: Agent[]) => void;
  isLoading?: boolean;
  queuedAgents?: Agent[];
  isStreaming?: boolean;
  presetAgents?: Agent[] | null;
  onClearPresetAgents?: () => void;
}

export function InitialChainInput({
  onSendChain,
  isLoading = false,
  queuedAgents = [],
  isStreaming = false,
  presetAgents,
  onClearPresetAgents,
}: InitialChainInputProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: uuidv4(),
      ...DEFAULT_AGENT_CONFIG,
    },
  ]);

  const [animatingAgentId, setAnimatingAgentId] = useState<string | null>(null);

  // Handle preset loading
  useEffect(() => {
    if (presetAgents && presetAgents.length > 0) {
      setAgents(presetAgents);
      // Clear the preset agents state after loading
      if (onClearPresetAgents) {
        onClearPresetAgents();
      }
    }
  }, [presetAgents, onClearPresetAgents]);

  const addAgent = () => {
    if (agents.length < 3) {
      const newAgent = {
        id: uuidv4(),
        ...DEFAULT_AGENT_CONFIG,
      };

      setAnimatingAgentId(newAgent.id);
      setAgents([...agents, newAgent]);

      // Remove animation state after animation completes
      setTimeout(() => {
        setAnimatingAgentId(null);
      }, 400);
    }
  };

  const updateAgent = (index: number, updatedAgent: Agent) => {
    const newAgents = [...agents];
    newAgents[index] = updatedAgent;
    setAgents(newAgents);
  };

  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

  const handleSendChain = () => {
    const validAgents = agents.filter((agent) => agent.prompt.trim() !== "");
    if (validAgents.length > 0) {
      onSendChain(validAgents);
      // Clear all prompts and reset to single agent after sending
      setAgents([
        {
          id: uuidv4(),
          ...DEFAULT_AGENT_CONFIG,
        },
      ]);
    }
  };

  const canSend = agents.some((agent) => agent.prompt.trim() !== "");
  const canRemove = agents.length > 1;

  // Regular Chain Mode Input - Horizontal Layout
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="flex items-end justify-center">
        <div className="w-full max-w-6xl">
          <div className="flex items-stretch justify-center">
            {agents.map((agent, index) => (
              <div key={agent.id} className="flex items-stretch">
                {/* Agent Card using AgentInput component */}
                <div
                  className={`${
                    agents.length === 1
                      ? "w-full max-w-4xl min-w-[800px]"
                      : agents.length === 2
                        ? "w-full max-w-none min-w-[550px] flex-1"
                        : "w-full max-w-none min-w-[450px] flex-1"
                  } backdrop-blur-sm  ${
                    queuedAgents.some((qa) => qa.id === agent.id)
                      ? "border-lavender-400/50"
                      : ""
                  } ${
                    animatingAgentId === agent.id
                      ? "animate-in slide-in-from-right-8 fade-in duration-300 ease-out"
                      : ""
                  }`}
                >
                  <AgentInput
                    agent={agent}
                    onUpdate={(updatedAgent) =>
                      updateAgent(index, updatedAgent)
                    }
                    onRemove={() => removeAgent(index)}
                    canRemove={canRemove}
                    index={index}
                    onAddAgent={agents.length < 3 ? addAgent : undefined}
                    canAddAgent={agents.length < 3}
                    isLastAgent={index === agents.length - 1}
                    onSendChain={
                      index === agents.length - 1 ? handleSendChain : undefined
                    }
                    canSend={canSend}
                    isLoading={isLoading || isStreaming}
                  />

                  {/* Queued Agent Indicator */}
                  {queuedAgents.some((qa) => qa.id === agent.id) && (
                    <div className="text-xs text-lavender-400/60 text-center mt-2">
                      Queued...
                    </div>
                  )}
                </div>

                {/* Connection Selector (between agents) */}
                {index < agents.length - 1 && (
                  <ConnectionIcon
                    connectionType={agents[index + 1].connection?.type}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
