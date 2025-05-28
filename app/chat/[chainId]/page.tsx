"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useConvex,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sidebar } from "../../../components/sidebar";
import { ChatArea } from "../../../components/chat-area";
import { InputArea } from "../../../components/input-area";
import type { Agent } from "../../../components/agent-input";
import { evaluateCondition } from "../../../lib/condition-evaluator";

function ChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const chainId = params.chainId as string;
  const convex = useConvex(); // Use the authenticated Convex client

  const [isLoading, setIsLoading] = useState(false);
  const [queuedAgents, setQueuedAgents] = useState<Agent[]>([]);
  const [focusedAgentIndex, setFocusedAgentIndex] = useState<number | null>(
    null
  );
  const [presetAgents, setPresetAgents] = useState<Agent[] | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const createSession = useMutation(api.mutations.createSession);
  const addAgentStep = useMutation(api.mutations.addAgentStep);
  const updateAgentSkipped = useMutation(api.mutations.updateAgentSkipped);

  // Verify session exists and user has access
  const session = useQuery(
    api.queries.getChatSession,
    chainId ? { sessionId: chainId as Id<"chatSessions"> } : "skip"
  );

  // Get agent steps for the current session
  const agentSteps = useQuery(
    api.queries.getAgentSteps,
    chainId && isValidSession
      ? { sessionId: chainId as Id<"chatSessions"> }
      : "skip"
  );

  // Validate session on mount and param changes
  useEffect(() => {
    if (session === undefined) {
      // Still loading
      setIsValidSession(null);
    } else if (session === null) {
      // Session doesn't exist or user doesn't have access
      setIsValidSession(false);
    } else {
      // Valid session
      setIsValidSession(true);
    }
  }, [session]);

  // Redirect to /chat if invalid session
  useEffect(() => {
    if (isValidSession === false) {
      router.push("/chat");
    }
  }, [isValidSession, router]);

  // Check for preset agents from localStorage
  useEffect(() => {
    if (isValidSession === true && chainId) {
      // Check for preset agents (from welcome screen)
      const storedPresets = localStorage.getItem(`preset-agents-${chainId}`);
      if (storedPresets) {
        try {
          const agents = JSON.parse(storedPresets);
          setPresetAgents(agents);
          // Clean up localStorage
          localStorage.removeItem(`preset-agents-${chainId}`);
        } catch (error) {
          console.error("Failed to parse stored preset agents:", error);
        }
        return;
      }

      // Check for pending agents (from landing page input)
      const pendingAgents = localStorage.getItem(`pending-agents-${chainId}`);
      if (pendingAgents) {
        try {
          const agents = JSON.parse(pendingAgents);
          // Clean up localStorage first
          localStorage.removeItem(`pending-agents-${chainId}`);
          // Automatically run the chain
          runChain(chainId as Id<"chatSessions">, agents);
        } catch (error) {
          console.error("Failed to parse pending agents:", error);
        }
      }
    }
  }, [isValidSession, chainId]);

  // Check if any agent is currently streaming
  const isStreaming = agentSteps?.some((step) => step.isStreaming) || false;

  const handleFocusAgent = (agentIndex: number | null) => {
    setFocusedAgentIndex(agentIndex);
  };

  const handleLoadPreset = async (agents: Agent[]) => {
    try {
      setFocusedAgentIndex(null);
      setPresetAgents(agents);
      console.log("Loaded preset with agents:", agents);
    } catch (error) {
      console.error("Failed to load preset:", error);
    }
  };

  const handleSendFocusedAgent = async (agent: Agent) => {
    if (!chainId || focusedAgentIndex === null) return;

    try {
      // Add agent step to database
      const stepId = await addAgentStep({
        sessionId: chainId as Id<"chatSessions">,
        index: focusedAgentIndex,
        model: agent.model,
        prompt: agent.prompt,
        name: agent.name,
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
    if (!chainId) {
      // Create a new session and redirect to it
      try {
        // Create a descriptive title based on the first agent's prompt
        const firstPrompt = agents[0]?.prompt || "";
        const title =
          firstPrompt.length > 0
            ? `${firstPrompt.split(" ").slice(0, 3).join(" ")}...`
            : `Chat with ${agents.length} agents`;

        const sessionId = await createSession({
          title,
        });

        // Redirect to the new session and run the chain there
        router.push(`/chat/${sessionId}`);
        // Note: The chain will need to be re-triggered in the new session
        // This could be handled via URL params or localStorage if needed
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    } else {
      await runChain(chainId as Id<"chatSessions">, agents);
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
    beforeIndex: number,
    retries: number = 3,
    delay: number = 500
  ): Promise<string> => {
    for (let attempt = 0; attempt < retries; attempt++) {
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

          if (
            !step.wasSkipped &&
            step.isComplete &&
            (step.response || step.streamedContent)
          ) {
            const output = step.response || step.streamedContent || "";
            return output;
          }
        }

        // If no output found and this isn't the last retry, wait and try again
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(
          `Error getting previous agent output (attempt ${attempt + 1}):`,
          error
        );
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return "";
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

        // For conditional agents, evaluate the condition
        if (
          agent.connection?.type === "conditional" &&
          agent.connection?.condition
        ) {
          // First get the previous agent output to evaluate against
          const previousOutput = await getPreviousAgentOutput(sessionId, i);
          const shouldSkip = !evaluateCondition(
            agent.connection.condition,
            previousOutput
          );

          if (shouldSkip) {
            // Skip this agent and add a step showing it was skipped
            const stepId = await addAgentStep({
              sessionId,
              index: i,
              model: agent.model,
              prompt: agent.prompt,
              name: agent.name,
              connectionType: agent.connection.type,
              connectionCondition: agent.connection.condition,
              sourceAgentIndex: agent.connection.sourceAgentId
                ? parseInt(agent.connection.sourceAgentId)
                : undefined,
            });

            await updateAgentSkipped({
              stepId,
              skipReason: "Condition not met",
            });
            continue;
          }
        }

        // Build context based on connection type
        let prompt = agent.prompt;

        // For agents after the first one, build appropriate context
        if (i > 0) {
          const connectionType = agent.connection?.type || "direct";

          if (connectionType === "direct") {
            // For direct connections, get the immediate previous agent's output
            const previousOutput = await getPreviousAgentOutput(sessionId, i);
            if (previousOutput) {
              prompt = `Previous agent's output:\n${previousOutput}\n\nNow, based on that output: ${agent.prompt}`;
            }
          } else if (connectionType === "conditional") {
            // For conditional connections, also include context if condition passes
            const previousOutput = await getPreviousAgentOutput(sessionId, i);
            if (previousOutput) {
              prompt = `Previous agent's output:\n${previousOutput}\n\nNow, based on that output: ${agent.prompt}`;
            }
          } else if (connectionType === "parallel") {
            // For parallel connections, build full conversation context
            const context = await buildConversationContext(sessionId, i);
            if (context) {
              prompt = context + agent.prompt;
            }
          }
        }

        // Add agent step to database
        const stepId = await addAgentStep({
          sessionId,
          index: i,
          model: agent.model,
          prompt: agent.prompt,
          name: agent.name,
          connectionType: agent.connection?.type || "direct",
          connectionCondition: agent.connection?.condition,
          sourceAgentIndex: agent.connection?.sourceAgentId
            ? parseInt(agent.connection.sourceAgentId)
            : undefined,
        });

        // Stream the AI response
        await streamAgentResponse(stepId, agent.model, prompt);
      }
    } catch (error) {
      console.error("Failed to run chain:", error);
    } finally {
      setIsLoading(false);
      setQueuedAgents([]);
    }
  };

  const streamAgentResponse = async (
    stepId: Id<"agentSteps">,
    model: string,
    prompt: string
  ) => {
    const response = await fetch("/api/run-chain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        model,
        prompt,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to start streaming: ${response.statusText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error("No reader available");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token" && parsed.content) {
                // Token updates are handled by the backend
              } else if (parsed.type === "complete") {
                return;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reading stream:", error);
    } finally {
      reader.releaseLock();
    }
  };

  const handleClearPresetAgents = () => {
    setPresetAgents(null);
  };

  // Show loading state while validating session
  if (isValidSession === null) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Don't render if session is invalid (will redirect)
  if (isValidSession === false) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar currentSessionId={chainId} />
      <div className="flex-1 flex flex-col relative w-full">
        <ChatArea
          sessionId={chainId as Id<"chatSessions">}
          focusedAgentIndex={focusedAgentIndex}
          onFocusAgent={handleFocusAgent}
          onLoadPreset={handleLoadPreset}
        />
        <InputArea
          onSendChain={handleSendChain}
          onSendFocusedAgent={handleSendFocusedAgent}
          isLoading={isLoading}
          isStreaming={isStreaming}
          queuedAgents={queuedAgents}
          focusedAgentIndex={focusedAgentIndex}
          presetAgents={presetAgents}
          onClearPresetAgents={handleClearPresetAgents}
        />
      </div>
    </div>
  );
}

export default function ChainPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Welcome to Chain Chat
            </h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access the chat functionality
            </p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ChatPageContent />
      </Authenticated>
    </>
  );
}
