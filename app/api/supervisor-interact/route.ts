import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import { streamLLM } from "../../../lib/llm-stream";
import { executeAgentInternally } from "../../../lib/internal-agent-execution";
import {
  parseSupervisorPrompt,
  buildSupervisorPrompt,
  buildAgentTaskPrompt,
  validateAgentMentions,
  type MentionTask,
} from "../../../lib/supervisor-parser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userInput } = await request.json();

    if (!sessionId || !userInput) {
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

    // Parse user input for @mentions
    const recentSteps = agentSteps.slice(-5);
    const parsedPrompt = parseSupervisorPrompt(userInput, recentSteps);
    const { valid: validMentions, invalid: invalidMentions } =
      validateAgentMentions(parsedPrompt.mentionTasks, recentSteps);

    // 🔍 DEBUG - Critical supervisor flow debugging
    console.log("🔍 DEBUG - User input:", userInput);
    console.log("🔍 DEBUG - Parsed mentions:", parsedPrompt.mentionTasks);
    console.log("🔍 DEBUG - Valid mentions:", validMentions);
    console.log("🔍 DEBUG - Invalid mentions:", invalidMentions);
    console.log("🔍 DEBUG - Recent steps count:", recentSteps.length);
    console.log(
      "🔍 DEBUG - All agent steps:",
      agentSteps.map((s) => ({ index: s.index, name: s.name }))
    );

    // Build supervisor context
    const supervisorHistory = supervisorTurns
      .slice(-3) // Last 3 turns for context
      .map(
        (turn) =>
          `User: ${turn.userInput}\nSupervisor: ${turn.supervisorResponse}`
      )
      .join("\n\n");

    const supervisorPrompt = buildSupervisorPrompt(
      userInput,
      recentSteps,
      supervisorHistory
    );

    // 🔍 DEBUG - Supervisor prompt debugging
    console.log(
      "🔍 DEBUG - Supervisor prompt (first 500 chars):",
      supervisorPrompt.substring(0, 500)
    );
    console.log("🔍 DEBUG - Supervisor history:", supervisorHistory);

    // Start supervisor turn in database
    const turnId = await convex.mutation(api.mutations.startSupervisorTurn, {
      sessionId: sessionId as Id<"chatSessions">,
      userInput,
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

          // NEW FLOW: For @mentions, execute agents FIRST, then supervisor completion
          if (validMentions.length > 0) {
            // 🔍 DEBUG - Agent execution flow
            console.log(
              "🚀 AGENT EXECUTION START - Valid mentions found:",
              validMentions.length
            );
            console.log(
              "🚀 AGENT EXECUTION - Mentions to process:",
              validMentions
            );

            // For @mentions, supervisor stays silent until agents complete
            // No "Processing..." message - just execute agents directly

            // Execute mentioned agents with UNIFIED streaming (eliminates duplication)
            const executedAgentUpdates: any[] = [];
            for (const mention of validMentions) {
              try {
                // Find agent by actual index, not array position
                const agentStep = agentSteps.find(
                  (step) => step.index === mention.agentIndex
                );

                if (!agentStep) {
                  console.error(
                    `❌ Agent step not found for index ${mention.agentIndex}`
                  );
                  continue;
                }

                console.log(
                  "✅ FOUND AGENT STEP:",
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
                  "🚀 EXECUTING AGENT with prompt (first 200 chars):",
                  agentPrompt.substring(0, 200) + "..."
                );
                console.log("🚀 AGENT MODEL:", agentStep.model);
                console.log("🚀 AGENT INDEX:", mention.agentIndex);

                // SINGLE UNIFIED STREAM - eliminates duplicate prompts and streaming
                let agentResponse = "";
                await streamLLM({
                  model: agentStep.model,
                  prompt: agentPrompt,
                  onChunk: async (chunk: string) => {
                    agentResponse += chunk;

                    // Stream only to agent column (no supervisor stream duplication)
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "agent_chunk",
                          agentIndex: mention.agentIndex,
                          content: chunk,
                          userPrompt: mention.taskPrompt, // Include user prompt for UI
                          turnId,
                        })}\n\n`
                      )
                    );
                  },
                  onComplete: async () => {
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

                    // Store in conversation history for persistence
                    await convex.mutation(
                      api.mutations.appendAgentConversation,
                      {
                        sessionId: sessionId as Id<"chatSessions">,
                        agentIndex: mention.agentIndex,
                        userPrompt: mention.taskPrompt,
                        agentResponse: agentResponse,
                        triggeredBy: "supervisor",
                      }
                    );

                    executedAgentUpdates.push({
                      agentIndex: mention.agentIndex,
                      userFacingTask: mention.taskPrompt,
                      responsePreview: agentResponse.slice(0, 200),
                    });
                  },
                  onError: async (error: Error) => {
                    console.error(
                      `Agent ${mention.agentIndex} streaming error:`,
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
                  "✅ AGENT EXECUTION COMPLETED, response length:",
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
            const completionMessage = `✅ Routed task to ${validMentions.map((m) => m.agentName).join(", ")} - see results in agent columns above.`;

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
