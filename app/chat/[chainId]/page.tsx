"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useConvex,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sidebar } from "../../../components/chat/sidebar";
import { MobileSidebarToggle } from "../../../components/MobileSidebarToggle";
import { ChatArea } from "../../../components/chat/chat-area";
import {
  InputAreaContainer,
  type InputMode,
} from "../../../components/input/input-area-container";

import type { Agent } from "../../../components/input/agent-input";
import { evaluateCondition } from "../../../lib/condition-evaluator";
import { PerformanceProvider } from "../../../lib/performance-context";
import Link from "next/link";
import { ArrowLeft, Bot, MessageSquare } from "lucide-react";
import { SupervisorInterface } from "../../../components/supervisor/supervisor-interface";
import { useCopyTracking } from "../../../lib/copy-tracking-context";
import { useSidebar } from "../../../lib/sidebar-context";

// Parallel execution type definitions
interface ExecutionGroup {
  type: "sequential" | "parallel";
  agents: Agent[];
  startIndex: number;
}

interface ParallelResult {
  agent: Agent;
  stepId: Id<"agentSteps">;
  result: string;
  success: boolean;
  error?: string;
  completedAt: number;
}

// Agent conversation structure for real-time streaming
interface AgentConversationTurn {
  userPrompt: string;
  agentResponse: string;
  timestamp: number;
  isStreaming?: boolean;
  isComplete?: boolean;
  references?: any[];
}

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

  // NEW: Agent conversation state for real-time streaming
  const [agentConversations, setAgentConversations] = useState<{
    [agentIndex: number]: AgentConversationTurn[];
  }>({});

  // Track whether auto-prompt has been sent for initial chain completion
  const hasAutoPromptedRef = useRef(false);
  const previousChainCompleteRef = useRef(false);

  const createSession = useMutation(api.mutations.createSession);
  const addAgentStep = useMutation(api.mutations.addAgentStep);
  const updateAgentSkipped = useMutation(api.mutations.updateAgentSkipped);
  const updateAgentStep = useMutation(api.mutations.updateAgentStep);

  // Copy tracking session management
  const { setSession } = useCopyTracking();

  // Get sidebar state for conditional styling
  const { isCollapsed: sidebarCollapsed } = useSidebar();

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

  // Load existing agent conversations from database
  const existingAgentConversations = useQuery(
    api.queries.getAllAgentConversations,
    chainId && isValidSession
      ? { sessionId: chainId as Id<"chatSessions"> }
      : "skip"
  );

  // Initialize agent conversations from database when loaded
  useEffect(() => {
    if (
      existingAgentConversations &&
      Array.isArray(existingAgentConversations)
    ) {
      const conversationMap: { [agentIndex: number]: AgentConversationTurn[] } =
        {};

      existingAgentConversations.forEach((agentConv: any) => {
        if (agentConv.conversationHistory) {
          conversationMap[agentConv.agentIndex] =
            agentConv.conversationHistory.map((turn: any) => ({
              userPrompt: turn.userPrompt,
              agentResponse: turn.agentResponse,
              timestamp: turn.timestamp,
              isStreaming: false,
              isComplete: true,
              references: turn.references || [], // Include references from the conversation history
            }));
        }
      });

      setAgentConversations(conversationMap);
    }
  }, [existingAgentConversations]);

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
      // If there's only one agent, automatically focus on it
      // This provides a better UX by showing the focused agent input instead of supervisor
      // for single-agent chains, making it more intuitive for users
      if (agentSteps.length === 1) {
        setFocusedAgentIndex(0); // Focus on the single agent
        setInputMode("focused");
      } else {
        // Switch to supervisor mode for multiple agents - always use supervisor for multiple agents
        // Ensure no agent is focused when we have multiple agents
        if (focusedAgentIndex !== null) {
          setFocusedAgentIndex(null);
        }
        setInputMode("supervisor");
        // Set status based on whether chain is complete and not currently running
        const allCompleted = agentSteps.every(
          (step) => step.isComplete || step.wasSkipped
        );
        const anyStreaming = agentSteps.some((step) => step.isStreaming);
        const anyStarted = agentSteps.some(
          (step) => step.response || step.streamedContent || step.isStreaming
        );

        // Only set to ready if all complete, none streaming, and at least one has started
        if (allCompleted && !anyStreaming && anyStarted) {
          setSupervisorStatus("ready");
        } else if (anyStreaming || anyStarted) {
          setSupervisorStatus("orchestrating");
        } else {
          setSupervisorStatus("ready"); // Default state for new chains
        }
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
    if (!chainId) return;

    try {
      setIsLoading(true);

      // Create agent step in database
      const stepId = await addAgentStep({
        sessionId: chainId as Id<"chatSessions">,
        model: agent.model,
        prompt: agent.prompt,
        name: agent.name,
        index: focusedAgentIndex || 0,
        connectionType: "direct", // Focus mode is always direct
      });

      // Stream the response
      await streamAgentResponse(stepId, agent.model, agent.prompt, agent);
    } catch (error) {
      console.error("Error running focused agent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChain = async (agents: Agent[]) => {
    if (!chainId) return;

    try {
      setIsLoading(true);
      await runChain(chainId as Id<"chatSessions">, agents);
    } catch (error) {
      console.error("Error running chain:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupervisorSend = useCallback(
    async (message: string) => {
      if (!chainId || !message.trim()) return;

      setSupervisorTyping(false);
      setSupervisorStatus("thinking");

      try {
        // Handle both structured JSON and legacy string formats
        let requestBody: any;
        try {
          // Try to parse as JSON (new structured format)
          const parsed = JSON.parse(message);
          requestBody = {
            sessionId: chainId,
            userInput: parsed.userInput,
            references: parsed.references,
            fullContext: parsed.fullContext,
          };
        } catch (e) {
          // Fallback to legacy string format
          requestBody = {
            sessionId: chainId,
            userInput: message.trim(),
          };
        }

        const response = await fetch("/api/supervisor-interact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
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

                  case "agent_stream_start":
                    // REMOVED: This event is no longer needed with unified streaming
                    // The agent_chunk handler now creates the conversation turn
                    console.log(
                      "Agent stream starting for agent:",
                      data.agentName,
                      "at index",
                      data.agentIndex,
                      "(handled by agent_chunk)"
                    );
                    break;

                  case "agent_coordination":
                    // NEW: Handle supervisor coordination events (no duplication)
                    console.log("📋 SUPERVISOR COORDINATION:", {
                      agentIndex: data.agentIndex,
                      agentName: data.agentName,
                      userPrompt: data.userPrompt,
                      turnId: data.turnId,
                    });

                    // Create conversation turn for coordination
                    setAgentConversations((prev) => {
                      const updated = { ...prev };

                      if (!updated[data.agentIndex]) {
                        updated[data.agentIndex] = [];
                      }

                      // Add coordination turn - actual execution will be handled separately
                      updated[data.agentIndex].push({
                        userPrompt: data.userPrompt,
                        agentResponse: "", // Will be filled by actual execution
                        timestamp: Date.now(),
                        isStreaming: false, // Coordination is instant
                        isComplete: false, // Execution pending
                      });

                      return updated;
                    });
                    break;

                  case "agent_execution_complete":
                    // NEW: Handle completion of supervisor-triggered execution
                    console.log("✅ SUPERVISOR EXECUTION COMPLETE:", {
                      agentIndex: data.agentIndex,
                      agentName: data.agentName,
                      responseLength: data.response?.length || 0,
                    });

                    // Update the conversation with the final response
                    setAgentConversations((prev) => {
                      const updated = { ...prev };

                      if (
                        updated[data.agentIndex] &&
                        updated[data.agentIndex].length > 0
                      ) {
                        const lastTurnIndex =
                          updated[data.agentIndex].length - 1;
                        const lastTurn =
                          updated[data.agentIndex][lastTurnIndex];

                        // Update the turn that matches this user prompt
                        if (lastTurn.userPrompt === data.userPrompt) {
                          updated[data.agentIndex][lastTurnIndex] = {
                            ...lastTurn,
                            agentResponse: data.response,
                            isComplete: true,
                            isStreaming: false,
                          };
                        }
                      }

                      return updated;
                    });
                    break;

                  case "agent_execution_error":
                    // NEW: Handle execution errors from supervisor
                    console.error("❌ SUPERVISOR EXECUTION ERROR:", {
                      agentIndex: data.agentIndex,
                      error: data.error,
                    });

                    // Update the conversation with error state
                    setAgentConversations((prev) => {
                      const updated = { ...prev };

                      if (
                        updated[data.agentIndex] &&
                        updated[data.agentIndex].length > 0
                      ) {
                        const lastTurnIndex =
                          updated[data.agentIndex].length - 1;
                        const lastTurn =
                          updated[data.agentIndex][lastTurnIndex];

                        updated[data.agentIndex][lastTurnIndex] = {
                          ...lastTurn,
                          agentResponse: `Error: ${data.error}`,
                          isComplete: true,
                          isStreaming: false,
                        };
                      }

                      return updated;
                    });
                    break;

                  case "agent_chunk":
                    // LEGACY: Handle agent chunks from legacy supervisor streaming (DEPRECATED)
                    // This should no longer be used after removing legacy supervisor execution
                    console.log("📥 LEGACY CHUNK RECEIVED (DEPRECATED):", {
                      agentIndex: data.agentIndex,
                      contentLength: data.content?.length || 0,
                      contentPreview: data.content?.substring(0, 50) || "",
                      userPrompt: data.userPrompt,
                      timestamp: Date.now(),
                    });

                    setAgentConversations((prev) => {
                      const updated = { ...prev };

                      // Check if we need to create a new conversation turn
                      // This happens when receiving first chunk with userPrompt
                      if (
                        !updated[data.agentIndex] ||
                        updated[data.agentIndex].length === 0 ||
                        (data.userPrompt &&
                          !updated[data.agentIndex].some(
                            (turn) =>
                              turn.userPrompt === data.userPrompt &&
                              turn.isStreaming
                          ))
                      ) {
                        // Create new conversation turn with the userPrompt from the chunk
                        if (data.userPrompt) {
                          if (!updated[data.agentIndex]) {
                            updated[data.agentIndex] = [];
                          }

                          console.log(
                            `🆕 CREATING NEW CONVERSATION TURN for agent ${data.agentIndex}:`,
                            {
                              userPrompt: data.userPrompt,
                              firstChunk: data.content?.substring(0, 50) || "",
                            }
                          );

                          // Add new conversation turn
                          updated[data.agentIndex].push({
                            userPrompt: data.userPrompt,
                            agentResponse: data.content || "",
                            timestamp: Date.now(),
                            isStreaming: true,
                            isComplete: false,
                          });

                          return updated;
                        }
                        return prev; // No conversation turn to update and no userPrompt
                      }

                      // Otherwise update existing conversation
                      const lastTurnIndex = updated[data.agentIndex].length - 1;
                      if (lastTurnIndex >= 0) {
                        const existingResponse =
                          updated[data.agentIndex][lastTurnIndex].agentResponse;
                        const newResponse = existingResponse + data.content;

                        console.log(
                          `📝 APPENDING TO EXISTING TURN for agent ${data.agentIndex}:`,
                          {
                            existingLength: existingResponse.length,
                            newChunkLength: data.content?.length || 0,
                            totalLength: newResponse.length,
                            chunkPreview: data.content?.substring(0, 50) || "",
                          }
                        );

                        updated[data.agentIndex][lastTurnIndex] = {
                          ...updated[data.agentIndex][lastTurnIndex],
                          agentResponse: newResponse,
                          isStreaming: true,
                        };
                      }

                      return updated;
                    });
                    break;

                  case "agent_complete":
                    // UPDATED: Handle unified stream completion with full response
                    console.log(
                      "Agent completed streaming:",
                      data.agentName,
                      "at index",
                      data.agentIndex
                    );

                    setAgentConversations((prev) => {
                      const updated = { ...prev };

                      // Create new conversation if needed (for cases where we missed chunks)
                      if (
                        !updated[data.agentIndex] ||
                        updated[data.agentIndex].length === 0
                      ) {
                        if (data.userPrompt && data.response) {
                          updated[data.agentIndex] = [
                            {
                              userPrompt: data.userPrompt,
                              agentResponse: data.response,
                              timestamp: Date.now(),
                              isStreaming: false,
                              isComplete: true,
                            },
                          ];
                          return updated;
                        }
                        return prev;
                      }

                      // Find the right conversation turn to update
                      let turnIndex = updated[data.agentIndex].length - 1;

                      // If we have userPrompt in the data, find the matching turn
                      if (data.userPrompt) {
                        const matchingTurnIndex = updated[
                          data.agentIndex
                        ].findIndex(
                          (turn) => turn.userPrompt === data.userPrompt
                        );

                        if (matchingTurnIndex >= 0) {
                          turnIndex = matchingTurnIndex;
                        }
                      }

                      // Update the turn with complete status
                      updated[data.agentIndex][turnIndex] = {
                        ...updated[data.agentIndex][turnIndex],
                        // Use data.response if available (for cases where chunks were missed)
                        agentResponse:
                          data.response ||
                          updated[data.agentIndex][turnIndex].agentResponse,
                        isStreaming: false,
                        isComplete: true,
                      };

                      return updated;
                    });
                    break;

                  case "agent_error":
                    // NEW: Handle agent streaming errors
                    console.error(
                      "Agent streaming error:",
                      data.agentIndex,
                      "Error:",
                      data.error
                    );

                    setAgentConversations((prev) => {
                      const updated = { ...prev };
                      if (
                        !updated[data.agentIndex] ||
                        updated[data.agentIndex].length === 0
                      ) {
                        return prev;
                      }

                      const lastTurnIndex = updated[data.agentIndex].length - 1;
                      const lastTurn = updated[data.agentIndex][lastTurnIndex];

                      updated[data.agentIndex][lastTurnIndex] = {
                        ...lastTurn,
                        agentResponse:
                          lastTurn.agentResponse + `\n\nError: ${data.error}`,
                        isStreaming: false,
                        isComplete: false, // Mark as incomplete due to error
                      };

                      return updated;
                    });
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
    },
    [chainId]
  );

  const handleSupervisorTyping = (isTyping: boolean) => {
    setSupervisorTyping(isTyping);
  };

  // Auto-prompt when chain initialization completes - SUPERVISOR streams the message
  useEffect(() => {
    if (agentSteps && agentSteps.length > 1 && supervisorTurns) {
      const allCompleted = agentSteps.every(
        (step) => step.isComplete || step.wasSkipped
      );
      const anyStreaming = agentSteps.some((step) => step.isStreaming);
      const anyStarted = agentSteps.some(
        (step) => step.response || step.streamedContent || step.isStreaming
      );

      const isChainComplete = allCompleted && !anyStreaming && anyStarted;
      const hasNoSupervisorTurns = supervisorTurns.length === 0;

      // Only auto-prompt if:
      // 1. Chain is complete for the first time
      // 2. No supervisor turns exist (indicating this is initial chain completion)
      // 3. We haven't already sent the auto-prompt
      // 4. We have multiple agents (single agents use focused mode)
      if (
        isChainComplete &&
        hasNoSupervisorTurns &&
        !hasAutoPromptedRef.current &&
        !previousChainCompleteRef.current
      ) {
        console.log(
          "Chain initialization complete - supervisor will auto-prompt"
        );

        // Generate a turn ID and simulate supervisor streaming the welcome message
        const autoTurnId = `auto-${Date.now()}`;
        const welcomeMessage = "What would you like to do next?";

        // Set supervisor status to ready and stream the welcome message
        setSupervisorStatus("ready");
        setSupervisorStreamContent((prev) => ({
          ...prev,
          [autoTurnId]: "",
        }));

        // Simulate typing the message character by character
        let currentIndex = 0;
        const typeInterval = setInterval(() => {
          if (currentIndex <= welcomeMessage.length) {
            setSupervisorStreamContent((prev) => ({
              ...prev,
              [autoTurnId]: welcomeMessage.slice(0, currentIndex),
            }));
            currentIndex++;
          } else {
            clearInterval(typeInterval);
            // Save the message to the database after typing completes
            fetch("/api/supervisor-interact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: chainId,
                userInput: "",
                autoWelcomeMessage: welcomeMessage,
                isAutoWelcome: true,
              }),
            }).catch(console.error);
          }
        }, 50); // Type at 50ms per character

        hasAutoPromptedRef.current = true;
      }

      // Track chain completion state for next render
      previousChainCompleteRef.current = isChainComplete;
    }
  }, [agentSteps, supervisorTurns, chainId]);

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
        const previousSteps = await convex.query(api.queries.getAgentSteps, {
          sessionId,
        });

        if (!previousSteps || previousSteps.length === 0) return "";

        // Get the output from the agent immediately before this one
        for (let i = beforeIndex - 1; i >= 0; i--) {
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

  // Helper function to group agents by execution type
  const groupAgentsByExecution = (agents: Agent[]): ExecutionGroup[] => {
    const groups: ExecutionGroup[] = [];
    let currentGroup: ExecutionGroup | null = null;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const connectionType = agent.connection?.type || "direct";

      // First agent is always sequential
      if (i === 0) {
        currentGroup = {
          type: "sequential",
          agents: [agent],
          startIndex: i,
        };
        groups.push(currentGroup);
        continue;
      }

      // If this agent is parallel and the previous group is also parallel, add to existing group
      if (connectionType === "parallel" && currentGroup?.type === "parallel") {
        currentGroup.agents.push(agent);
      }
      // If this agent is parallel but previous wasn't, start new parallel group
      else if (connectionType === "parallel") {
        currentGroup = {
          type: "parallel",
          agents: [agent],
          startIndex: i,
        };
        groups.push(currentGroup);
      }
      // If this agent is not parallel, start new sequential group
      else {
        currentGroup = {
          type: "sequential",
          agents: [agent],
          startIndex: i,
        };
        groups.push(currentGroup);
      }
    }

    return groups;
  };

  // TRULY CONCURRENT Helper function to execute parallel agents with rate limit handling
  const executeParallelGroup = async (
    group: ExecutionGroup,
    sessionId: Id<"chatSessions">,
    sharedContext: string
  ): Promise<ParallelResult[]> => {
    console.log(
      `🚀 PARALLEL-EXECUTION: Starting ${group.agents.length} agents with intelligent spacing`
    );

    // Generate a shared execution group ID for all parallel agents
    const executionGroupId = Math.floor(Date.now() / 1000);
    const executionStartTime = Date.now();

    // Function to execute a single agent with retry logic
    const executeAgentWithRetry = async (
      agent: Agent,
      groupIndex: number,
      delay: number = 0
    ): Promise<ParallelResult & { agentIndex: number; duration: number }> => {
      const agentIndex = group.startIndex + groupIndex;

      // Add staggered delay to prevent simultaneous API hits
      if (delay > 0) {
        console.log(
          `🚀 PARALLEL-EXECUTION: Agent ${agentIndex} waiting ${delay}ms to prevent rate limit`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const agentStartTime = Date.now();

      console.log(
        `🚀 PARALLEL-EXECUTION: Agent ${agentIndex} (${agent.name || "Unnamed"}) starting...`
      );

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Build prompt with shared context
          const prompt = sharedContext
            ? `${sharedContext}\n\nNow, based on that context: ${agent.prompt}`
            : agent.prompt;

          // CREATE DATABASE RECORD AND START STREAMING
          const stepId = await addAgentStep({
            sessionId,
            index: agentIndex,
            model: agent.model,
            prompt: agent.prompt,
            name: agent.name,
            connectionType: agent.connection?.type || "parallel",
            connectionCondition: agent.connection?.condition,
            sourceAgentIndex: agent.connection?.sourceAgentId
              ? parseInt(agent.connection.sourceAgentId)
              : undefined,
            executionGroup: executionGroupId,
          });

          // TEMPORARY: Use regular endpoint for all agents until parallel endpoint is fixed
          console.log(
            `🚀 AGENT-EXECUTION: Starting agent ${agentIndex} with connection type: ${agent.connection?.type}`
          );
          streamAgentResponse(stepId, agent.model, prompt, agent).catch(
            console.error
          );

          const duration = Date.now() - agentStartTime;
          console.log(
            `✅ PARALLEL-EXECUTION: Agent ${agentIndex} completed in ${duration}ms (attempt ${attempt + 1})`
          );

          return {
            agent,
            stepId,
            agentIndex,
            success: true,
            completedAt: Date.now(),
            duration,
          } as ParallelResult & { agentIndex: number; duration: number };
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || String(error);

          // Check if it's a rate limit error
          if (
            errorMessage.includes("Rate limit exceeded") ||
            errorMessage.includes("rate limit") ||
            errorMessage.includes("429")
          ) {
            console.warn(
              `⚠️ PARALLEL-EXECUTION: Agent ${agentIndex} hit rate limit (attempt ${attempt + 1}/${maxRetries})`
            );

            if (attempt < maxRetries - 1) {
              // Exponential backoff with jitter for rate limit errors
              const backoffDelay = Math.min(
                1000 * Math.pow(2, attempt) + Math.random() * 1000,
                10000
              );
              console.log(
                `🚀 PARALLEL-EXECUTION: Agent ${agentIndex} retrying in ${backoffDelay}ms`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue;
            }
          } else {
            // For non-rate-limit errors, don't retry as aggressively
            console.error(
              `❌ PARALLEL-EXECUTION: Agent ${agentIndex} failed with non-rate-limit error:`,
              errorMessage
            );
            break;
          }
        }
      }

      const duration = Date.now() - agentStartTime;
      console.error(
        `❌ PARALLEL-EXECUTION: Agent ${agentIndex} failed after all retries in ${duration}ms`
      );

      return {
        agent,
        stepId: null as any,
        agentIndex,
        success: false,
        error: lastError?.message || "Unknown error after retries",
        completedAt: Date.now(),
        duration,
      } as ParallelResult & { agentIndex: number; duration: number };
    };

    // Execute agents in true parallel - NO stagger delays for maximum concurrency
    const concurrentExecutionPromises = group.agents.map(
      (agent, groupIndex) => {
        // Remove ALL delays for true parallel execution
        const staggerDelay = 0; // No delays - full parallel execution
        return executeAgentWithRetry(agent, groupIndex, staggerDelay);
      }
    );

    // Wait for ALL agents to complete
    const results = await Promise.all(concurrentExecutionPromises);
    const totalExecutionTime = Date.now() - executionStartTime;

    console.log(
      `🚀 PARALLEL-EXECUTION: All ${results.length} agents completed in ${totalExecutionTime}ms`
    );
    console.log(
      `🚀 PARALLEL-EXECUTION: Individual timings:`,
      results.map((r) => `Agent ${r.agentIndex}: ${r.duration}ms`).join(", ")
    );

    // Log success/failure summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (failureCount > 0) {
      console.warn(
        `⚠️ PARALLEL-EXECUTION: ${successCount} successful, ${failureCount} failed due to rate limits`
      );
    }

    // Fetch final results from database
    console.log(
      `🚀 PARALLEL-EXECUTION: Fetching final results from database...`
    );
    const agentSteps = await convex.query(api.queries.getAgentSteps, {
      sessionId,
    });

    // Match results with database responses
    const finalResults = results.map((result) => {
      if (result.success) {
        const completedStep = agentSteps?.find(
          (step) =>
            step.index === result.agentIndex &&
            step.isComplete &&
            !step.wasSkipped
        );

        const responseText =
          completedStep?.response || completedStep?.streamedContent || "";
        console.log(
          `🚀 PARALLEL-EXECUTION: Agent ${result.agentIndex} result length: ${responseText.length} chars`
        );

        return {
          ...result,
          result: responseText,
        };
      }
      return {
        ...result,
        result: "",
      };
    });

    console.log(`✅ PARALLEL-EXECUTION: Parallel group execution completed`);
    return finalResults;
  };

  // Helper function to format parallel results
  const formatParallelResults = (results: ParallelResult[]): string => {
    let formattedOutput = "--- Parallel Analysis Results ---\n\n";

    results.forEach((result, index) => {
      const agentName = result.agent.name || `Agent ${index + 1}`;
      const modelName = result.agent.model;

      if (result.success) {
        formattedOutput += `**${agentName} (${modelName}):**\n${result.result}\n\n`;
      } else {
        formattedOutput += `**${agentName} (${modelName}) - FAILED:**\n${result.error || "Unknown error"}\n\n`;
      }
    });

    formattedOutput += "--- End Parallel Results ---";
    return formattedOutput;
  };

  const runChain = async (sessionId: Id<"chatSessions">, agents: Agent[]) => {
    setIsLoading(true);
    // Set all agents in queue immediately for instant column display - KEEP THEM VISIBLE
    setQueuedAgents([...agents]);

    // Immediately switch to supervisor mode when chain starts
    setInputMode("supervisor");
    setSupervisorStatus("orchestrating");

    try {
      // Group agents by execution type
      const executionGroups = groupAgentsByExecution(agents);
      console.log("Execution groups created:", executionGroups);

      let lastOutput = ""; // Track output from previous group
      let processedAgentCount = 0;

      for (const group of executionGroups) {
        console.log(
          `Processing group: ${group.type} with ${group.agents.length} agents`
        );

        // DO NOT update queued agents anymore - keep all columns visible permanently

        if (group.type === "sequential") {
          // Handle sequential execution (existing logic)
          for (const agent of group.agents) {
            const agentIndex = processedAgentCount;
            console.log(
              `Executing sequential agent ${agentIndex}: ${agent.name || `Node ${agentIndex + 1}`}`
            );

            // DO NOT remove agents from queue - keep all columns visible

            // For conditional agents, evaluate the condition
            if (
              agent.connection?.type === "conditional" &&
              agent.connection?.condition
            ) {
              const shouldSkip = !evaluateCondition(
                agent.connection.condition,
                lastOutput
              );

              if (shouldSkip) {
                const stepId = await addAgentStep({
                  sessionId,
                  index: agentIndex,
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
                processedAgentCount++;
                continue;
              }
            }

            // Build context for sequential agent
            let prompt = agent.prompt;
            if (agentIndex > 0) {
              const connectionType = agent.connection?.type || "direct";

              if (
                connectionType === "direct" ||
                connectionType === "conditional"
              ) {
                if (lastOutput) {
                  prompt = `Previous agent's output:\n${lastOutput}\n\nNow, based on that output: ${agent.prompt}`;
                }
              }
            }

            // Add agent step to database
            const stepId = await addAgentStep({
              sessionId,
              index: agentIndex,
              model: agent.model,
              prompt: agent.prompt,
              name: agent.name,
              connectionType: agent.connection?.type || "direct",
              connectionCondition: agent.connection?.condition,
              sourceAgentIndex: agent.connection?.sourceAgentId
                ? parseInt(agent.connection.sourceAgentId)
                : undefined,
            });

            // Execute the agent
            await streamAgentResponse(stepId, agent.model, prompt, agent);

            // Get the output for next agent
            lastOutput = await getPreviousAgentOutput(
              sessionId,
              agentIndex + 1
            );
            processedAgentCount++;
          }
        } else {
          // Handle parallel execution
          console.log(
            `Executing parallel group with ${group.agents.length} agents starting at index ${group.startIndex}`
          );

          // Keep all parallel agents visible during execution - NO removal from queue
          const parallelResults = await executeParallelGroup(
            group,
            sessionId,
            lastOutput
          );

          // DO NOT remove parallel agents from queue - keep all columns visible

          // Format and aggregate results
          lastOutput = formatParallelResults(parallelResults);
          processedAgentCount += group.agents.length;

          console.log(
            "Parallel execution completed. Successful results:",
            parallelResults.filter((r) => r.success).length,
            "Failed results:",
            parallelResults.filter((r) => !r.success).length
          );
          console.log("Aggregated results length:", lastOutput.length);
        }
      }

      console.log("Chain execution completed successfully");
    } catch (error) {
      console.error("Failed to run chain:", error);
    } finally {
      setIsLoading(false);
      // DO NOT clear queued agents - keep all columns visible permanently
      // setQueuedAgents([]); // REMOVED - columns stay open permanently
    }
  };

  // Direct streaming function that bypasses API for true parallel execution
  const streamAgentDirectly = async (
    stepId: Id<"agentSteps">,
    model: string,
    prompt: string,
    agent?: Agent
  ) => {
    console.log(
      `🚀 DIRECT-PARALLEL: Starting direct stream for agent ${stepId}`
    );

    try {
      // Import LLM functions directly - this requires moving to server-side or using an edge function
      // For now, let's use a special parallel endpoint
      const response = await fetch("/api/stream-parallel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          model,
          prompt,
          grokOptions: agent?.grokOptions,
          claudeOptions: agent?.claudeOptions,
          images: agent?.images?.map((img) => ({
            url: img.preview,
            description: img.name,
          })),
          audioTranscription: agent?.audioTranscription,
          webSearchResults: agent?.webSearchData?.results,
          isParallel: true, // Flag to indicate this is a parallel request
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DIRECT-PARALLEL: Response failed:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText,
        });
        throw new Error(
          `Direct parallel streaming failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // Handle the streaming response same as normal agent
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body reader");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "token" && data.content) {
                fullContent += data.content;
                // Update UI directly through convex
                await convex.mutation(api.mutations.updateStreamedContent, {
                  stepId,
                  content: fullContent,
                });
              } else if (data.type === "complete") {
                await convex.mutation(api.mutations.completeAgentExecution, {
                  stepId,
                  response: fullContent,
                  tokenUsage: data.tokenUsage,
                  estimatedCost: data.estimatedCost,
                });
                break;
              }
            } catch (e) {
              // Ignore JSON parsing errors for non-JSON lines
            }
          }
        }
      }

      console.log(`✅ DIRECT-PARALLEL: Agent ${stepId} completed successfully`);
    } catch (error) {
      console.error(`❌ DIRECT-PARALLEL: Agent ${stepId} failed:`, error);
      console.log("🔄 DIRECT-PARALLEL: Falling back to regular stream-agent");

      // Fallback to the regular streaming endpoint
      try {
        await streamAgentResponse(stepId, model, prompt, agent);
        console.log("✅ DIRECT-PARALLEL: Fallback succeeded");
        return;
      } catch (fallbackError) {
        console.error(
          "❌ DIRECT-PARALLEL: Fallback also failed:",
          fallbackError
        );
      }

      await convex.mutation(api.mutations.updateAgentStep, {
        stepId,
        error: error instanceof Error ? error.message : "Unknown error",
        isComplete: true,
        isStreaming: false,
      });
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
      let errorMessage = `Failed to start streaming: ${response.statusText}`;
      let isRateLimit = false;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;

        // Check if it's a rate limit error
        if (
          response.status === 429 ||
          errorMessage.includes("Rate limit") ||
          errorMessage.includes("rate limit")
        ) {
          isRateLimit = true;
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            errorMessage = `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`;
          } else {
            errorMessage =
              "Rate limit exceeded. Please wait a moment before trying again.";
          }
          console.warn("⚠️ RATE-LIMIT:", errorMessage);
        } else {
          console.error("API Error Details:", errorData);
        }
      } catch (e) {
        console.error("Could not parse error response");
      }

      // For rate limit errors, throw a specific error type that can be caught and retried
      if (isRateLimit) {
        const rateLimitError = new Error(errorMessage);
        rateLimitError.name = "RateLimitError";
        throw rateLimitError;
      }

      console.error(errorMessage);
      throw new Error(errorMessage);
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

  // Watch for changes in the number of agents and update input mode accordingly
  useEffect(() => {
    if (agentSteps) {
      // If we had one agent but now have more, switch to supervisor mode
      if (agentSteps.length > 1 && focusedAgentIndex !== null) {
        setFocusedAgentIndex(null);
        setInputMode("supervisor");
      }
    }
  }, [agentSteps?.length]);

  // Set current session for copy tracking
  useEffect(() => {
    if (chainId) {
      setSession(chainId);
    }
  }, [chainId, setSession]);

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
    <div
      className="flex h-screen bg-lavender-400/10 lg:bg-neutral-950 scrollbar-none"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Sidebar
        currentSessionId={chainId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={toggleMobileSidebar}
      />
      <MobileSidebarToggle
        isOpen={isMobileSidebarOpen}
        onToggle={toggleMobileSidebar}
      />
      <div
        className={`flex-1 flex flex-col relative w-full scrollbar-none bg-gray-950 border-l-2 border-lavender-400/30 shadow-2xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          !sidebarCollapsed ? "mt-4 border-t-2 rounded-tl-2xl" : ""
        }`}
      >
        {/* Conditional rendering based on input mode */}

        <ChatArea
          sessionId={chainId as Id<"chatSessions">}
          focusedAgentIndex={focusedAgentIndex}
          onFocusAgent={handleFocusAgent}
          onLoadPreset={handleLoadPreset}
          queuedAgents={queuedAgents}
          agentConversations={agentConversations}
        />
        {inputMode === "supervisor" ? (
          <SupervisorInterface
            sessionId={chainId as Id<"chatSessions">}
            agentSteps={agentSteps || []}
            onSupervisorSend={handleSupervisorSend}
            onSupervisorTyping={handleSupervisorTyping}
            onFocusAgent={(agentIndex) => handleFocusAgent(agentIndex)}
            isLoading={isLoading}
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
        ) : (
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
                    name:
                      agentSteps[focusedAgentIndex].name ||
                      `Node ${focusedAgentIndex + 1}`,
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
        )}
      </div>
    </div>
  );
}

export default function ChainPage() {
  const { user } = useUser();

  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center bg-gray-900/50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Welcome to Chain Chat
            </h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access the chat functionality
            </p>

            {/* Debug info */}
            {user && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600/50 rounded-lg">
                <p className="text-yellow-400 text-sm mb-2">
                  Debug: Clerk shows you're signed in as{" "}
                  {user.emailAddresses?.[0]?.emailAddress}
                </p>
                <p className="text-yellow-400 text-xs">
                  But Convex authentication is not working. Try signing out and
                  back in.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                  Sign In
                </button>
              </SignInButton>

              {user && (
                <SignOutButton>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
                    Sign Out & Reset
                  </button>
                </SignOutButton>
              )}
            </div>
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
