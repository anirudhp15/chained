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
import { MobileSidebarToggle } from "../../../components/MobileSidebarToggle";
import { ChatArea } from "../../../components/chat-area";
import {
  InputAreaContainer,
  type InputMode,
} from "../../../components/input-area-container";
import { SupervisorConversation } from "../../../components/supervisor-conversation";
import type { Agent } from "../../../components/agent-input";
import { evaluateCondition } from "../../../lib/condition-evaluator";
import { SupervisorModal } from "@/components/supervisor-modal";
import { PerformanceProvider } from "../../../lib/performance-context";
import Link from "next/link";
import { ArrowLeft, Bot, MessageSquare } from "lucide-react";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Supervisor mode state
  const [inputMode, setInputMode] = useState<
    "initial" | "focused" | "supervisor"
  >("initial");
  const [supervisorStreaming, setSupervisorStreaming] = useState(false);

  // Supervisor modal state
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [supervisorModalFullscreen, setSupervisorModalFullscreen] =
    useState(false);
  const [supervisorTyping, setSupervisorTyping] = useState(false);
  const [supervisorStatus, setSupervisorStatus] = useState<
    "idle" | "thinking" | "orchestrating" | "ready"
  >("idle");

  // Add supervisor streaming content state
  const [supervisorStreamContent, setSupervisorStreamContent] = useState<{
    [turnId: string]: string;
  }>({});

  const createSession = useMutation(api.mutations.createSession);
  const addAgentStep = useMutation(api.mutations.addAgentStep);
  const updateAgentSkipped = useMutation(api.mutations.updateAgentSkipped);
  const updateAgentStep = useMutation(api.mutations.updateAgentStep);

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

  // Get supervisor turns for supervisor mode
  const supervisorTurns = useQuery(
    api.queries.getSupervisorTurns,
    chainId && isValidSession && inputMode === "supervisor"
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

  // Determine current input mode based on state
  useEffect(() => {
    if (focusedAgentIndex !== null) {
      setInputMode("focused");
    } else if (agentSteps && agentSteps.length > 0) {
      // Switch to supervisor mode immediately when there are agent steps
      if (inputMode !== "supervisor") {
        setInputMode("supervisor");
        // Set status based on whether chain is complete
        const allCompleted = agentSteps.every(
          (step) => step.isComplete || step.wasSkipped
        );
        setSupervisorStatus(allCompleted ? "ready" : "orchestrating");
      }
    } else {
      // No agent steps, stay in initial mode
      if (inputMode !== "initial") {
        setInputMode("initial");
      }
    }
  }, [focusedAgentIndex, agentSteps, inputMode]);

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
  const isStreaming =
    agentSteps?.some((step) => step.isStreaming) || supervisorStreaming;

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

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
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

      // Stream the AI response with enhanced options
      await streamAgentResponse(stepId, agent.model, agent.prompt, agent);
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

  const handleSupervisorSend = async (message: string) => {
    if (!chainId || !message.trim()) return;

    setSupervisorTyping(false);
    setSupervisorStatus("thinking");

    try {
      const response = await fetch("/api/supervisor-interact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: chainId,
          userInput: message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send supervisor message");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      let currentTurnId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "supervisor_turn_start":
                  currentTurnId = data.turnId;
                  setSupervisorStreamContent((prev) => ({
                    ...prev,
                    [data.turnId]: "",
                  }));
                  setSupervisorStatus("thinking");
                  break;

                case "supervisor_chunk":
                  if (currentTurnId) {
                    setSupervisorStreamContent((prev) => ({
                      ...prev,
                      [currentTurnId!]:
                        (prev[currentTurnId!] || "") + data.content,
                    }));
                  }
                  break;

                case "mention_execution_start":
                  setSupervisorStatus("orchestrating");
                  break;

                case "agent_execution_internal":
                  // Agent is executing internally - no new UI updates needed
                  // The agent steps will update via the existing queries
                  console.log(
                    "Agent executing internally:",
                    data.agentName,
                    "at index",
                    data.agentIndex
                  );
                  break;

                case "agent_execution_complete":
                  console.log(
                    "Agent completed:",
                    data.agentName,
                    "Preview:",
                    data.responsePreview
                  );
                  break;

                case "agent_execution_error":
                  console.error(
                    "Agent execution failed:",
                    data.agentName,
                    "Error:",
                    data.error
                  );
                  break;

                case "supervisor_complete":
                case "complete":
                  setSupervisorStatus("ready");
                  // Clear streaming content for this turn since it's now persisted
                  if (currentTurnId) {
                    setSupervisorStreamContent((prev) => {
                      const newState = { ...prev };
                      delete newState[currentTurnId!];
                      return newState;
                    });
                  }
                  break;

                case "error":
                  setSupervisorStatus("ready");
                  console.error("Supervisor error:", data.error);
                  break;

                default:
                  console.log("Unhandled supervisor event:", data.type, data);
              }
            } catch (e) {
              console.error("Error parsing supervisor stream:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in supervisor interaction:", error);
      setSupervisorStatus("ready");
    }
  };

  const handleSupervisorTyping = (isTyping: boolean) => {
    setSupervisorTyping(isTyping);
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

    // Immediately switch to supervisor mode when chain starts
    setInputMode("supervisor");
    setSupervisorStatus("orchestrating");

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

        // Stream the AI response with enhanced options
        await streamAgentResponse(stepId, agent.model, prompt, agent);
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
    prompt: string,
    agent?: Agent
  ) => {
    // Prepare multimodal data
    const images = agent?.images?.map((img) => ({
      url: img.preview,
      description: img.name,
    }));

    const webSearchResults = agent?.webSearchData?.results;

    const response = await fetch("/api/run-chain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        model,
        prompt,
        grokOptions: agent?.grokOptions,
        claudeOptions: agent?.claudeOptions,
        images,
        audioTranscription: agent?.audioTranscription,
        webSearchResults,
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
              } else if (
                parsed.type === "thinking" &&
                parsed.thinking !== undefined
              ) {
                // Thinking process updates - update the agent step with thinking content
                console.log("Thinking process streaming:", parsed.thinking);

                // Update the agent step with thinking content
                try {
                  await updateAgentStep({
                    stepId: stepId,
                    thinking: parsed.thinking,
                    isThinking: parsed.isThinking !== false, // Default to true if not specified
                    isComplete: false,
                    isStreaming: true,
                  });
                } catch (error) {
                  console.error("Failed to update thinking:", error);
                }
              } else if (parsed.type === "complete") {
                // Log enhanced features if present
                if (parsed.thinking) {
                  console.log("Thinking process received:", parsed.thinking);
                }
                if (parsed.toolCalls) {
                  console.log("Tool calls received:", parsed.toolCalls);
                }
                return;
              } else if (parsed.type === "error") {
                console.error("Streaming error:", parsed.error);
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
      <Sidebar
        currentSessionId={chainId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={toggleMobileSidebar}
      />
      <MobileSidebarToggle
        isOpen={isMobileSidebarOpen}
        onToggle={toggleMobileSidebar}
      />
      <div className="flex-1 flex flex-col relative w-full">
        {/* Conditional rendering based on input mode */}

        <ChatArea
          sessionId={chainId as Id<"chatSessions">}
          focusedAgentIndex={focusedAgentIndex}
          onFocusAgent={handleFocusAgent}
          onLoadPreset={handleLoadPreset}
        />
        {inputMode === "supervisor" && (
          <SupervisorModal
            sessionId={chainId as Id<"chatSessions">}
            isOpen={supervisorModalOpen}
            onToggle={() => setSupervisorModalOpen(!supervisorModalOpen)}
            isFullscreen={supervisorModalFullscreen}
            onToggleFullscreen={() =>
              setSupervisorModalFullscreen(!supervisorModalFullscreen)
            }
            isTyping={supervisorTyping}
            supervisorStatus={supervisorStatus}
            supervisorStreamContent={supervisorStreamContent}
          />
        )}
        <InputAreaContainer
          mode={inputMode}
          sessionId={chainId as Id<"chatSessions">}
          onSendChain={handleSendChain}
          onSendFocusedAgent={handleSendFocusedAgent}
          focusedAgentIndex={focusedAgentIndex}
          focusedAgent={
            focusedAgentIndex !== null && agentSteps
              ? {
                  id: agentSteps[focusedAgentIndex]._id,
                  model: agentSteps[focusedAgentIndex].model,
                  prompt: "", // Start with empty prompt for new input
                  name: agentSteps[focusedAgentIndex].name,
                  connection: {
                    type:
                      agentSteps[focusedAgentIndex].connectionType ===
                        "supervisor" ||
                      agentSteps[focusedAgentIndex].connectionType ===
                        "collaborative"
                        ? "direct"
                        : ((agentSteps[focusedAgentIndex].connectionType ||
                            "direct") as
                            | "direct"
                            | "conditional"
                            | "parallel"
                            | "collaborative"),
                    condition:
                      agentSteps[focusedAgentIndex].connectionCondition,
                    sourceAgentId:
                      agentSteps[
                        focusedAgentIndex
                      ].sourceAgentIndex?.toString(),
                  },
                }
              : null
          }
          presetAgents={presetAgents}
          onClearPresetAgents={handleClearPresetAgents}
          onSupervisorSend={handleSupervisorSend}
          onSupervisorTyping={handleSupervisorTyping}
          agentSteps={agentSteps || []}
          isLoading={isLoading}
          isStreaming={isStreaming}
          queuedAgents={queuedAgents}
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
        <PerformanceProvider>
          <ChatPageContent />
        </PerformanceProvider>
      </Authenticated>
    </>
  );
}
