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
              "🚀 SUPERVISOR-INTERACT: === AGENT EXECUTION START ==="
            );
            console.log(
              "🚀 SUPERVISOR-INTERACT: Valid mentions found:",
              validMentions.length
            );
            console.log(
              "🚀 SUPERVISOR-INTERACT: Mentions to process:",
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

            // For @mentions, supervisor stays silent until agents complete
            // No "Processing..." message - just execute agents directly

            // Execute mentioned agents with UNIFIED streaming (eliminates duplication)
            const executedAgentUpdates: any[] = [];
            for (const mention of validMentions) {
              try {
                console.log(
                  `🚀 SUPERVISOR-INTERACT: Processing mention ${mention.agentIndex} (${mention.agentName})`
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

                // Build the internal prompt for the agent
                const agentPrompt = buildAgentTaskPrompt(
                  mention.taskPrompt,
                  chainContext,
                  agentHistory?.conversationHistory
                    ?.map((h) => h.agentResponse)
                    .join("\n") || "",
                  mention.taskPrompt
                );

                console.log(
                  "🚀 SUPERVISOR-INTERACT: === STARTING AGENT EXECUTION ==="
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Agent name:",
                  agentStep.name
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Agent model:",
                  agentStep.model
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Agent index:",
                  mention.agentIndex
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Task prompt:",
                  mention.taskPrompt
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Full prompt (first 200 chars):",
                  agentPrompt.substring(0, 200) + "..."
                );
                console.log(
                  "🚀 SUPERVISOR-INTERACT: Full prompt length:",
                  agentPrompt.length
                );

                // CONVERSATION-ISOLATED STREAM - preserves original agent data
                let agentResponse = "";
                console.log(
                  "🚀 SUPERVISOR-INTERACT: About to call streamLLM..."
                );

                try {
                  await streamLLM({
                    model: agentStep.model,
                    prompt: agentPrompt,
                    // NO stepId passed - prevents original agentStep data modification
                    onChunk: async (chunk: string) => {
                      console.log(
                        `🔥 CHUNK DEBUG: Agent ${mention.agentIndex} received chunk:`,
                        {
                          chunkLength: chunk.length,
                          chunkPreview: chunk.substring(0, 50),
                          agentResponseLength: agentResponse.length,
                        }
                      );
                      agentResponse += chunk;

                      // Stream only to conversation UI (no agentStep data pollution)
                      const chunkData = {
                        type: "agent_chunk",
                        agentIndex: mention.agentIndex,
                        content: chunk,
                        userPrompt: mention.taskPrompt, // Include user prompt for UI
                        turnId,
                      };

                      console.log(
                        `📤 SENDING CHUNK: Agent ${mention.agentIndex}:`,
                        {
                          type: chunkData.type,
                          contentLength: chunkData.content.length,
                          contentPreview: chunkData.content.substring(0, 50),
                        }
                      );

                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify(chunkData)}\n\n`
                        )
                      );
                    },
                    onComplete: async () => {
                      console.log(
                        `✅ SUPERVISOR-INTERACT: Agent ${mention.agentIndex} execution completed`
                      );
                      console.log(
                        `✅ SUPERVISOR-INTERACT: Final response length: ${agentResponse.length}`
                      );

                      // Signal agent completion with full context
                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({
                            type: "agent_complete",
                            agentIndex: mention.agentIndex,
                            agentName: mention.agentName,
                            response: agentResponse,
                            userPrompt: mention.taskPrompt,
                            turnId,
                          })}\n\n`
                        )
                      );

                      // Store ONLY in conversation history - DO NOT modify original agentStep
                      console.log(
                        `💾 SUPERVISOR-INTERACT: Saving conversation for agent ${mention.agentIndex}`
                      );

                      // Extract clean task prompt without reference markers for display
                      const cleanTaskPrompt = extractCleanTaskPrompt(
                        mention.taskPrompt
                      );

                      await convex.mutation(
                        api.mutations.appendAgentConversation,
                        {
                          sessionId: sessionId as Id<"chatSessions">,
                          agentIndex: mention.agentIndex,
                          userPrompt: cleanTaskPrompt, // Use clean prompt without reference markers
                          agentResponse: agentResponse,
                          triggeredBy: "supervisor",
                          references: references, // References stored separately
                        }
                      );
                      console.log(
                        `✅ SUPERVISOR-INTERACT: Conversation saved for agent ${mention.agentIndex}`
                      );

                      executedAgentUpdates.push({
                        agentIndex: mention.agentIndex,
                        userFacingTask: mention.taskPrompt,
                        responsePreview: agentResponse.slice(0, 200),
                      });
                    },
                    onError: async (error: Error) => {
                      console.error(
                        `❌ SUPERVISOR-INTERACT: Agent ${mention.agentIndex} streaming error:`,
                        error
                      );
                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({
                            type: "agent_error",
                            agentIndex: mention.agentIndex,
                            error: error.message,
                            turnId,
                          })}\n\n`
                        )
                      );
                    },
                  });

                  console.log(
                    "✅ SUPERVISOR-INTERACT: streamLLM call completed successfully"
                  );
                } catch (streamError: any) {
                  console.error(
                    `❌ SUPERVISOR-INTERACT: streamLLM failed for agent ${mention.agentIndex}:`,
                    streamError
                  );
                  console.error("❌ SUPERVISOR-INTERACT: Error details:", {
                    name: streamError?.name || "UnknownError",
                    message: streamError?.message || String(streamError),
                    stack: streamError?.stack || "No stack trace",
                  });

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "agent_error",
                        agentIndex: mention.agentIndex,
                        error: `streamLLM execution failed: ${streamError?.message || String(streamError)}`,
                        turnId,
                      })}\n\n`
                    )
                  );
                }

                console.log(
                  "✅ SUPERVISOR-INTERACT: AGENT EXECUTION COMPLETED, response length:",
                  agentResponse.length
                );
              } catch (agentError) {
                console.error(
                  `❌ Agent execution failed for ${mention.agentName}:`,
                  agentError
                );
              }
            }

            // SUPERVISOR RESPONSE: Simple completion message (no streaming duplication)
            const completionMessage = `Routed task to ${validMentions
              .map((m: any) => {
                // Convert agent names to LLM format for user display
                const displayName = m.agentName.toLowerCase().includes("agent")
                  ? m.agentName.replace(/agent/gi, "LLM")
                  : m.agentName;
                return displayName;
              })
              .join(", ")}, see results below.`;

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "supervisor_chunk",
                  content: completionMessage,
                  turnId,
                  isCompletion: true,
                })}\n\n`
              )
            );

            supervisorResponse = completionMessage;
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
