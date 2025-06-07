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

          // Stream supervisor response
          await streamLLM({
            model: "gpt-4", // Use GPT-4 for supervisor intelligence
            prompt: supervisorPrompt,
            onChunk: async (chunk: string) => {
              supervisorResponse += chunk;

              // Send chunk to client
              const data = JSON.stringify({
                type: "supervisor_chunk",
                content: chunk,
                turnId,
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));

              // Update database with streaming content
              await convex.mutation(api.mutations.updateSupervisorTurn, {
                turnId,
                streamedContent: supervisorResponse,
              });
            },
            onComplete: async () => {
              // Supervisor response complete, now handle mentions
            },
            onError: async (error: Error) => {
              throw error;
            },
          });

          // If there are valid mentions, execute agent tasks internally
          if (validMentions.length > 0) {
            // Send mention execution start signal
            const mentionData = JSON.stringify({
              type: "mention_execution_start",
              mentions: validMentions,
            });
            controller.enqueue(
              new TextEncoder().encode(`data: ${mentionData}\n\n`)
            );

            // Process agent mentions sequentially (simplified event streaming)
            for (const mention of validMentions) {
              try {
                // Only send minimal status update
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "status",
                      message: "Processing request...",
                    })}\n\n`
                  )
                );

                // Find the corresponding agent step
                const agentStep = recentSteps.find(
                  (step: any) => step.index === mention.agentIndex
                );

                if (!agentStep) {
                  console.error(`Agent step not found for index ${mention.agentIndex}`);
                  continue;
                }

                // Build context from chain history
                const chainContext = await convex.query(
                  api.queries.getChainContext,
                  {
                    sessionId: sessionId as Id<"chatSessions">,
                    beforeIndex: mention.agentIndex,
                  }
                );

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
                  chainContext || "",
                  agentHistory || "",
                  supervisorResponse // Pass supervisor's synthesized instruction
                );

                // Execute agent internally
                const agentResponse = await executeAgentInternally({
                  model: agentStep.model,
                  prompt: agentPrompt,
                  sessionId: sessionId as Id<"chatSessions">,
                  agentIndex: mention.agentIndex,
                  stepId: agentStep._id,
                  convexClient: convex,
                });

                // Update agent conversation history
                await convex.mutation(api.mutations.appendAgentConversation, {
                  sessionId: sessionId as Id<"chatSessions">,
                  agentIndex: mention.agentIndex,
                  userPrompt: mention.taskPrompt,
                  agentResponse: agentResponse,
                  triggeredBy: "supervisor",
                });

                // Store reference for supervisor turn (but don't send to client)
                executedAgentUpdates.push({
                  agentIndex: mention.agentIndex,
                  userFacingTask: mention.taskPrompt,
                  responsePreview: agentResponse.slice(0, 200),
                });
              } catch (agentError) {
                console.error(
                  `Agent execution failed for ${mention.agentName}:`,
                  agentError
                );
                // Don't send error details to client - let supervisor handle gracefully
              }
            }
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
