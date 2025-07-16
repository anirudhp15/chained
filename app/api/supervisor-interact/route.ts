import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import { streamLLM } from "../../../lib/llm-stream";

import {
  parseSupervisorPrompt,
  buildSupervisorPrompt,
  buildAgentTaskPrompt,
  validateAgentMentions,
  type MentionTask,
  extractCleanTaskPrompt,
} from "../../../lib/supervisor-parser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { sessionId, isAutoWelcome, autoWelcomeMessage } = requestBody;

    console.log("🔍 SUPERVISOR-INTERACT: === NEW REQUEST ===");
    console.log(
      "🔍 SUPERVISOR-INTERACT: Raw request body:",
      JSON.stringify(requestBody, null, 2)
    );

    // Handle both legacy string format and new structured format
    let userInput: string;
    let references: any[] = [];
    let fullContextForAI: string;

    // Check if we have references as a separate property first
    if (requestBody.references && Array.isArray(requestBody.references)) {
      // Direct properties format with references
      userInput = requestBody.userInput || "";
      references = requestBody.references;
      fullContextForAI = requestBody.fullContext || userInput;
      console.log(
        "🔍 SUPERVISOR-INTERACT: Direct properties with references format detected"
      );
    } else if (typeof requestBody.userInput === "string") {
      // Legacy format - just a string
      userInput = requestBody.userInput;
      fullContextForAI = userInput;
      console.log("🔍 SUPERVISOR-INTERACT: Legacy string format detected");
    } else if (requestBody.userInput) {
      // New structured format - parse JSON
      try {
        const parsed = JSON.parse(requestBody.userInput);
        userInput = parsed.userInput;
        references = parsed.references || [];
        fullContextForAI = parsed.fullContext || parsed.userInput;
        console.log("🔍 SUPERVISOR-INTERACT: Structured JSON format detected");
      } catch (e) {
        // Fallback to treating as string if JSON parsing fails
        userInput = requestBody.userInput;
        fullContextForAI = userInput;
        console.log(
          "🔍 SUPERVISOR-INTERACT: JSON parsing failed, fallback to string"
        );
      }
    } else {
      // Direct properties (alternative structured format)
      userInput = requestBody.userInput || "";
      references = requestBody.references || [];
      fullContextForAI = requestBody.fullContext || userInput;
      console.log("🔍 SUPERVISOR-INTERACT: Direct properties format detected");
    }

    console.log("🔍 SUPERVISOR-INTERACT: Parsed input:", {
      userInput,
      fullContextForAI,
      referencesCount: references.length,
      sessionId,
    });

    // Handle auto-welcome message from supervisor (after parsing references)
    if (isAutoWelcome && autoWelcomeMessage) {
      console.log(
        "🔍 SUPERVISOR-INTERACT: Auto-welcome message detected, not saving to database"
      );

      // Just return success without saving to database - frontend handles display
      return NextResponse.json({
        success: true,
        message: "Auto-welcome message handled (not persisted)",
      });
    }

    if (!sessionId || !userInput) {
      console.log("🔍 SUPERVISOR-INTERACT: Missing sessionId or userInput", {
        sessionId: !!sessionId,
        userInput: !!userInput,
      });
      return NextResponse.json(
        { error: "Missing sessionId or userInput" },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Set auth token for Convex
    const token = await authResult.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }
    convex.setAuth(token);

    // Fetch chain context (limit to last 5 agents for MVP)
    const agentSteps = await convex.query(api.queries.getAgentSteps, {
      sessionId: sessionId as Id<"chatSessions">,
    });

    if (!agentSteps || agentSteps.length === 0) {
      return NextResponse.json(
        { error: "No agent steps found for this session" },
        { status: 404 }
      );
    }

    // Get supervisor history for context
    const supervisorTurns = await convex.query(api.queries.getSupervisorTurns, {
      sessionId: sessionId as Id<"chatSessions">,
    });

    // Parse user input for @mentions (use fullContext for AI processing)
    const recentSteps = agentSteps.slice(-5);
    console.log("🔍 SUPERVISOR-INTERACT: Starting mention parsing...");
    console.log(
      "🔍 SUPERVISOR-INTERACT: Recent steps for parsing:",
      recentSteps.map((s) => ({ index: s.index, name: s.name, model: s.model }))
    );

    const parsedPrompt = parseSupervisorPrompt(fullContextForAI, recentSteps);
    const { valid: validMentions, invalid: invalidMentions } =
      validateAgentMentions(parsedPrompt.mentionTasks, recentSteps);

    // 🔍 DEBUG - Critical supervisor flow debugging
    console.log("🔍 SUPERVISOR-INTERACT: === PARSING RESULTS ===");
    console.log("🔍 SUPERVISOR-INTERACT: Clean user input:", userInput);
    console.log("🔍 SUPERVISOR-INTERACT: References:", references);
    console.log(
      "🔍 SUPERVISOR-INTERACT: Full context for AI:",
      fullContextForAI
    );
    console.log(
      "🔍 SUPERVISOR-INTERACT: Raw parsed mentions:",
      parsedPrompt.mentionTasks
    );
    console.log("🔍 SUPERVISOR-INTERACT: Valid mentions:", validMentions);
    console.log("🔍 SUPERVISOR-INTERACT: Invalid mentions:", invalidMentions);
    console.log(
      "🔍 SUPERVISOR-INTERACT: Recent steps count:",
      recentSteps.length
    );
    console.log(
      "🔍 SUPERVISOR-INTERACT: All agent steps:",
      agentSteps.map((s) => ({
        index: s.index,
        name: s.name,
        model: s.model,
        isComplete: s.isComplete,
      }))
    );

    // Check if there are any @mentions at all
    const hasAtSymbol = fullContextForAI.includes("@");
    console.log("🔍 SUPERVISOR-INTERACT: Contains @ symbol:", hasAtSymbol);
    if (hasAtSymbol) {
      console.log(
        "🔍 SUPERVISOR-INTERACT: @ mentions found in text:",
        fullContextForAI.match(/@\w+/g)
      );
    }

    // Build supervisor context (use fullContext for AI processing)
    const supervisorHistory = supervisorTurns
      .slice(-3) // Last 3 turns for context
      .map(
        (turn) =>
          `User: ${turn.userInput}\nSupervisor: ${turn.supervisorResponse}`
      )
      .join("\n\n");

    const supervisorPrompt = buildSupervisorPrompt(
      fullContextForAI,
      recentSteps,
      supervisorHistory
    );

    // 🔍 DEBUG - Supervisor prompt debugging
    console.log(
      "🔍 DEBUG - Supervisor prompt (first 500 chars):",
      supervisorPrompt.substring(0, 500)
    );
    console.log("🔍 DEBUG - Supervisor history:", supervisorHistory);

    // Start supervisor turn in database (store clean userInput and references separately)
    const turnId = await convex.mutation(api.mutations.startSupervisorTurn, {
      sessionId: sessionId as Id<"chatSessions">,
      userInput, // Clean user input without reference context
      references: references.length > 0 ? references : undefined,
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let supervisorResponse = "";
          let executedAgentUpdates: any[] = [];

          // Send turn start signal
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "supervisor_turn_start",
                turnId,
              })}\n\n`
            )
          );

          // CONVERSATION-ISOLATED FLOW: For @mentions, execute agents in conversation-only mode
          // This preserves original agent step data while enabling supervisor interactions
          if (validMentions.length > 0) {
            // 🔍 DEBUG - Agent execution flow
            console.log(
              "🚀 SUPERVISOR-INTERACT: === AGENT COORDINATION START ==="
            );
            console.log(
              "🚀 SUPERVISOR-INTERACT: Valid mentions found:",
              validMentions.length
            );
            console.log(
              "🚀 SUPERVISOR-INTERACT: Mentions to coordinate:",
              validMentions
            );

            // Send agent execution start signal
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "mention_execution_start",
                  mentionCount: validMentions.length,
                  turnId,
                })}\n\n`
              )
            );

            // COORDINATION-ONLY MODE: Don't execute agents directly, just store conversation turns
            // The frontend/existing systems will handle actual agent execution to prevent duplication

            const executedAgentUpdates: any[] = [];
            for (const mention of validMentions) {
              try {
                console.log(
                  `🚀 SUPERVISOR-INTERACT: Coordinating mention ${mention.agentIndex} (${mention.agentName})`
                );

                // Find agent by actual index, not array position
                const agentStep = agentSteps.find(
                  (step) => step.index === mention.agentIndex
                );

                if (!agentStep) {
                  console.error(
                    `❌ SUPERVISOR-INTERACT: Agent step not found for index ${mention.agentIndex}`
                  );
                  console.error(
                    "❌ SUPERVISOR-INTERACT: Available agent steps:",
                    agentSteps.map((s) => ({ index: s.index, name: s.name }))
                  );
                  continue;
                }

                console.log(
                  "✅ SUPERVISOR-INTERACT: FOUND AGENT STEP:",
                  agentStep.name,
                  agentStep.model,
                  "at index",
                  agentStep.index
                );

                // Extract clean task prompt without reference markers for display
                const cleanTaskPrompt = extractCleanTaskPrompt(
                  mention.taskPrompt
                );

                // COORDINATION-ONLY: Create conversation turn immediately without execution
                // The actual execution will be handled by the existing system to prevent duplication
                console.log(
                  `💾 SUPERVISOR-INTERACT: Creating coordination record for agent ${mention.agentIndex}`
                );

                await convex.mutation(api.mutations.appendAgentConversation, {
                  sessionId: sessionId as Id<"chatSessions">,
                  agentIndex: mention.agentIndex,
                  userPrompt: cleanTaskPrompt,
                  agentResponse: "", // Will be filled by the actual execution system
                  triggeredBy: "supervisor",
                  references: references,
                });

                console.log(
                  `✅ SUPERVISOR-INTERACT: Coordination record created for agent ${mention.agentIndex}`
                );

                // Send coordination signal to frontend
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "agent_coordination",
                      agentIndex: mention.agentIndex,
                      agentName: mention.agentName,
                      userPrompt: cleanTaskPrompt,
                      turnId,
                    })}\n\n`
                  )
                );

                // EXECUTE AGENT: Now trigger actual execution using the existing agent step
                console.log(
                  `🚀 SUPERVISOR-INTERACT: Starting actual execution for agent ${mention.agentIndex}`
                );

                // Build context from chain history
                const previousSteps = await convex.query(
                  api.queries.getPreviousAgentSteps,
                  {
                    sessionId: sessionId as Id<"chatSessions">,
                    beforeIndex: mention.agentIndex,
                  }
                );

                const chainContext = previousSteps
                  .map(
                    (step) =>
                      `${step.name || `Agent ${step.index + 1}`}: ${step.response || step.streamedContent || "No response"}`
                  )
                  .join("\n\n");

                // Get agent's conversation history
                const agentHistory = await convex.query(
                  api.queries.getAgentConversationHistory,
                  {
                    sessionId: sessionId as Id<"chatSessions">,
                    agentIndex: mention.agentIndex,
                  }
                );

                // Build the execution prompt for the agent
                const agentPrompt = buildAgentTaskPrompt(
                  mention.taskPrompt,
                  chainContext,
                  agentHistory?.conversationHistory
                    ?.map((h) => h.agentResponse)
                    .join("\n") || "",
                  mention.taskPrompt
                );

                // Execute the agent with streaming to the existing agent step
                let agentResponse = "";
                console.log(
                  `🚀 SUPERVISOR-INTERACT: Executing agent with stepId: ${agentStep._id}`
                );

                try {
                  await streamLLM({
                    model: agentStep.model,
                    prompt: agentPrompt,
                    onChunk: async (chunk: string) => {
                      agentResponse += chunk;

                      // Update the existing agent step with streaming content
                      await convex.mutation(
                        api.mutations.updateStreamedContent,
                        {
                          stepId: agentStep._id,
                          content: agentResponse,
                        }
                      );
                    },
                    onComplete: async () => {
                      console.log(
                        `✅ SUPERVISOR-INTERACT: Agent ${mention.agentIndex} execution completed`
                      );

                      // Update the agent step as complete
                      await convex.mutation(api.mutations.updateAgentStep, {
                        stepId: agentStep._id,
                        response: agentResponse,
                        isComplete: true,
                        isStreaming: false,
                      });

                      // Update conversation with final response
                      const conversations = await convex.query(
                        api.queries.getAgentConversationHistory,
                        {
                          sessionId: sessionId as Id<"chatSessions">,
                          agentIndex: mention.agentIndex,
                        }
                      );

                      // Try to update the conversation turn we just created
                      if (
                        conversations &&
                        conversations.conversationHistory &&
                        conversations.conversationHistory.length > 0
                      ) {
                        const lastTurn =
                          conversations.conversationHistory[
                            conversations.conversationHistory.length - 1
                          ];
                        if (
                          lastTurn.userPrompt === cleanTaskPrompt &&
                          !lastTurn.agentResponse
                        ) {
                          // Use appendAgentConversation to update - it should handle existing turns
                          await convex.mutation(
                            api.mutations.appendAgentConversation,
                            {
                              sessionId: sessionId as Id<"chatSessions">,
                              agentIndex: mention.agentIndex,
                              userPrompt: cleanTaskPrompt,
                              agentResponse: agentResponse,
                              triggeredBy: "supervisor",
                              references: references,
                            }
                          );
                        }
                      }

                      // Signal completion to frontend
                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({
                            type: "agent_execution_complete",
                            agentIndex: mention.agentIndex,
                            agentName: mention.agentName,
                            response: agentResponse,
                            userPrompt: cleanTaskPrompt,
                            turnId,
                          })}\n\n`
                        )
                      );
                    },
                    onError: async (error: Error) => {
                      console.error(
                        `❌ SUPERVISOR-INTERACT: Agent ${mention.agentIndex} execution error:`,
                        error
                      );

                      // Update agent step with error
                      await convex.mutation(api.mutations.updateAgentStep, {
                        stepId: agentStep._id,
                        error: error.message,
                        isComplete: true,
                        isStreaming: false,
                      });

                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({
                            type: "agent_execution_error",
                            agentIndex: mention.agentIndex,
                            error: error.message,
                            turnId,
                          })}\n\n`
                        )
                      );
                    },
                  });

                  console.log(
                    "✅ SUPERVISOR-INTERACT: Agent execution completed successfully"
                  );
                } catch (executionError: any) {
                  console.error(
                    `❌ SUPERVISOR-INTERACT: Agent execution failed for ${mention.agentIndex}:`,
                    executionError
                  );
                }

                executedAgentUpdates.push({
                  agentIndex: mention.agentIndex,
                  userFacingTask: mention.taskPrompt,
                  coordinatedOnly: true,
                });
              } catch (agentError) {
                console.error(
                  `❌ Agent coordination failed for ${mention.agentName}:`,
                  agentError
                );
              }
            }

            // SUPERVISOR RESPONSE: Simple coordination message (no execution duplication)
            const coordinationMessage = `Coordinating with ${validMentions
              .map((m: any) => {
                // Convert agent names to LLM format for user display
                const displayName = m.agentName.toLowerCase().includes("agent")
                  ? m.agentName.replace(/agent/gi, "LLM")
                  : m.agentName;
                return displayName;
              })
              .join(
                ", "
              )}. Tasks have been routed - execution will begin shortly.`;

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "supervisor_chunk",
                  content: coordinationMessage,
                  turnId,
                  isCompletion: true,
                })}\n\n`
              )
            );

            supervisorResponse = coordinationMessage;
          } else {
            // No mentions - normal supervisor response
            console.log(
              "❌ NO VALID MENTIONS - Supervisor responding directly"
            );

            // Stream supervisor response normally
            await streamLLM({
              model: "gpt-4",
              prompt: supervisorPrompt,
              onChunk: async (chunk: string) => {
                supervisorResponse += chunk;

                // Send chunk to client
                const data = JSON.stringify({
                  type: "supervisor_chunk",
                  content: chunk,
                  turnId,
                });
                controller.enqueue(
                  new TextEncoder().encode(`data: ${data}\n\n`)
                );

                // Update database with streaming content
                await convex.mutation(api.mutations.updateSupervisorTurn, {
                  turnId,
                  streamedContent: supervisorResponse,
                });
              },
              onComplete: async () => {
                // Supervisor response complete
              },
              onError: async (error: Error) => {
                throw error;
              },
            });
          }

          // Complete supervisor turn
          await convex.mutation(api.mutations.updateSupervisorTurn, {
            turnId,
            supervisorResponse,
            parsedMentions: validMentions,
            executedStepIds: [], // No new agent steps created, existing ones updated
            isComplete: true,
            isStreaming: false,
          });

          // Send completion signal
          const completeData = JSON.stringify({
            type: "supervisor_complete",
            turnId,
            executedAgents: validMentions.length,
            agentUpdates: executedAgentUpdates,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${completeData}\n\n`)
          );

          // Handle invalid mentions if any
          if (invalidMentions.length > 0) {
            const invalidData = JSON.stringify({
              type: "invalid_mentions",
              mentions: invalidMentions,
            });
            controller.enqueue(
              new TextEncoder().encode(`data: ${invalidData}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          console.error("Supervisor interaction error:", error);

          // Update turn with error
          await convex.mutation(api.mutations.updateSupervisorTurn, {
            turnId,
            error: error instanceof Error ? error.message : "Unknown error",
            isComplete: true,
            isStreaming: false,
          });

          const errorData = JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${errorData}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Supervisor API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
