"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "../../components/sidebar";
import { ChatArea } from "../../components/chat-area";
import { InputArea } from "../../components/input-area";
import type { Agent } from "../../components/agent-input";
import { ConvexHttpClient } from "convex/browser";
import { evaluateCondition } from "../../lib/condition-evaluator";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ChatPage() {
  const [currentSessionId, setCurrentSessionId] =
    useState<Id<"chatSessions"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queuedAgents, setQueuedAgents] = useState<Agent[]>([]);
  const [focusedAgentIndex, setFocusedAgentIndex] = useState<number | null>(
    null
  );

  const createSession = useMutation(api.mutations.createSession);
  const addAgentStep = useMutation(api.mutations.addAgentStep);
  const updateAgentSkipped = useMutation(api.mutations.updateAgentSkipped);

  // Get agent steps to determine streaming status
  const agentSteps = useQuery(
    api.queries.getAgentSteps,
    currentSessionId ? { sessionId: currentSessionId } : "skip"
  );

  // Check if any agent is currently streaming
  const isStreaming = agentSteps?.some((step) => step.isStreaming) || false;

  const handleNewChat = async () => {
    // Don't create session immediately - let welcome screen show
    setCurrentSessionId(null);
    setFocusedAgentIndex(null); // Reset focus when creating new chat
  };

  const handleSelectChat = (sessionId: string) => {
    setCurrentSessionId(sessionId as Id<"chatSessions">);
    setFocusedAgentIndex(null); // Reset focus when switching chats
  };

  const handleFocusAgent = (agentIndex: number | null) => {
    setFocusedAgentIndex(agentIndex);
  };

  const handleLoadPreset = async (agents: Agent[]) => {
    try {
      // Create a new session for the preset
      const sessionId = await createSession({
        title: `${agents.length > 0 ? agents[0].prompt.split(" ").slice(0, 3).join(" ") : "Preset"} Chain`,
      });
      setCurrentSessionId(sessionId);
      setFocusedAgentIndex(null); // Reset focus when loading preset
      console.log("Loaded preset with agents:", agents);
    } catch (error) {
      console.error("Failed to create session for preset:", error);
    }
  };

  const handleSendFocusedAgent = async (agent: Agent) => {
    if (!currentSessionId || focusedAgentIndex === null) return;

    try {
      // Add agent step to database
      const stepId = await addAgentStep({
        sessionId: currentSessionId,
        index: focusedAgentIndex,
        model: agent.model,
        prompt: agent.prompt,
        connectionType: "direct", // Focus mode is always direct
        connectionCondition: undefined,
        sourceAgentIndex: undefined,
      });

      // Stream the AI response
      await streamAgentResponse(stepId, agent.model, agent.prompt);
    } catch (error) {
      console.error("Failed to send focused agent:", error);
    }
  };

  const handleSendChain = async (agents: Agent[]) => {
    if (!currentSessionId) {
      // Create a new session if none exists
      try {
        const sessionId = await createSession({
          title: `Chat with ${agents.length} agents`,
        });
        setCurrentSessionId(sessionId);
        await runChain(sessionId, agents);
      } catch (error) {
        console.error("Failed to create session and run chain:", error);
      }
    } else {
      await runChain(currentSessionId, agents);
    }
  };

  const buildConversationContext = async (
    sessionId: Id<"chatSessions">,
    currentIndex: number
  ): Promise<string> => {
    if (currentIndex === 0) {
      return ""; // First agent doesn't need context
    }

    try {
      const previousSteps = await convex.query(
        api.queries.getPreviousAgentSteps,
        {
          sessionId,
          beforeIndex: currentIndex,
        }
      );

      if (previousSteps.length === 0) {
        return "";
      }

      let context = "Previous conversation:\n\n";

      for (const step of previousSteps) {
        // Skip agents that were skipped due to conditions
        if (step.wasSkipped) {
          context += `Agent ${step.index + 1} (${step.model}): [Skipped - ${step.skipReason}]\n\n`;
          continue;
        }

        context += `Agent ${step.index + 1} (${step.model}):\nPrompt: ${step.prompt}\n`;
        if (step.response || step.streamedContent) {
          context += `Response: ${step.response || step.streamedContent}\n\n`;
        }
      }

      context +=
        "Now, based on the above conversation, please respond to the following:\n\n";
      return context;
    } catch (error) {
      console.error("Error building conversation context:", error);
      return "";
    }
  };

  const getPreviousAgentOutput = async (
    sessionId: Id<"chatSessions">,
    beforeIndex: number
  ): Promise<string> => {
    try {
      const previousSteps = await convex.query(
        api.queries.getPreviousAgentSteps,
        {
          sessionId,
          beforeIndex,
        }
      );

      // Get the most recent non-skipped agent's output
      for (let i = previousSteps.length - 1; i >= 0; i--) {
        const step = previousSteps[i];
        if (!step.wasSkipped && (step.response || step.streamedContent)) {
          return step.response || step.streamedContent || "";
        }
      }

      return "";
    } catch (error) {
      console.error("Error getting previous agent output:", error);
      return "";
    }
  };

  const runChain = async (sessionId: Id<"chatSessions">, agents: Agent[]) => {
    setIsLoading(true);
    setQueuedAgents(agents.slice(1)); // Set all agents except the first as queued

    try {
      // Process agents sequentially with connection logic
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];

        // Update queued agents (remove current agent from queue)
        setQueuedAgents(agents.slice(i + 1));

        // Determine connection type (first agent is always direct)
        const connectionType =
          i === 0 ? "direct" : agent.connection?.type || "direct";

        // Add agent step to database with connection info
        const stepId = await addAgentStep({
          sessionId,
          index: i,
          model: agent.model,
          prompt: agent.prompt,
          connectionType,
          connectionCondition: agent.connection?.condition,
          sourceAgentIndex: i > 0 ? i - 1 : undefined,
        });

        // Handle conditional logic
        if (connectionType === "conditional" && i > 0) {
          const condition = agent.connection?.condition;
          if (condition) {
            // Get the previous agent's output for condition evaluation
            const previousOutput = await getPreviousAgentOutput(sessionId, i);

            // Evaluate the condition
            const shouldRun = evaluateCondition(condition, previousOutput);

            if (!shouldRun) {
              // Skip this agent
              await updateAgentSkipped({
                stepId,
                wasSkipped: true,
                skipReason: `Condition not met: ${condition}`,
              });
              console.log(
                `Agent ${i + 1} skipped: condition "${condition}" not met`
              );
              continue; // Skip to next agent
            }
          }
        }

        // Build conversation context for agents after the first one
        const context = await buildConversationContext(sessionId, i);
        const fullPrompt = context + agent.prompt;

        // Stream the AI response with full context
        await streamAgentResponse(stepId, agent.model, fullPrompt);

        // Wait a moment to ensure the response is complete before moving to next agent
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Failed to run agent chain:", error);
    } finally {
      setIsLoading(false);
      setQueuedAgents([]); // Clear queued agents when done
    }
  };

  const streamAgentResponse = async (
    stepId: Id<"agentSteps">,
    model: string,
    prompt: string
  ) => {
    try {
      const response = await fetch("/api/stream-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stepId, model, prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "complete") {
                console.log("Agent response completed:", data);
              } else if (data.type === "error") {
                console.error("Agent response error:", data.error);
              }
              // The database updates are handled by the API route
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to stream agent response:", error);
    }
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-black">
      <Sidebar
        currentSessionId={currentSessionId || undefined}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <ChatArea
          sessionId={currentSessionId}
          focusedAgentIndex={focusedAgentIndex}
          onFocusAgent={handleFocusAgent}
          onLoadPreset={handleLoadPreset}
        />
        <InputArea
          onSendChain={handleSendChain}
          isLoading={isLoading}
          queuedAgents={queuedAgents}
          focusedAgentIndex={focusedAgentIndex}
          onSendFocusedAgent={handleSendFocusedAgent}
          isStreaming={isStreaming}
          onLoadPreset={handleLoadPreset}
        />
      </div>
    </main>
  );
}
