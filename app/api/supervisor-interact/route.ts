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
    const recentSteps = agentSteps.slice(-5); // Limit context for MVP
    const parsedPrompt = parseSupervisorPrompt(userInput, recentSteps);
    const { valid: validMentions, invalid: invalidMentions } =
      validateAgentMentions(parsedPrompt.mentions, recentSteps);

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

            // Execute mentioned agents sequentially (internally)
            for (const mention of validMentions) {
              try {
                const agentStep = recentSteps[mention.agentIndex];

                // Signal internal execution start
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "agent_execution_internal",
                      agentName: mention.agentName,
                      agentIndex: mention.agentIndex,
                    })}\n\n`
                  )
                );

                // Update agent step to show it's working (for UI feedback)
                await convex.mutation(api.mutations.updateAgentStep, {
                  stepId: agentStep._id,
                  isStreaming: true,
                  isComplete: false,
                });

                // Update streamed content to show working status
                await convex.mutation(api.mutations.updateStreamedContent, {
                  stepId: agentStep._id,
                  content: "Working on supervisor task...",
                });

                // Build context for the agent
                const chainContext = recentSteps
                  .filter((_, index) => index !== mention.agentIndex)
                  .map(
                    (step) =>
                      `${step.name || `Agent ${step.index + 1}`}: ${step.response || "No response"}`
                  )
                  .join("\n\n");

                const agentHistory = agentStep.response || "";
                const agentPrompt = buildAgentTaskPrompt(
                  mention.taskPrompt,
                  chainContext,
                  agentHistory,
                  userInput
                );

                // Execute agent internally without creating new agentStep
                const agentResponse = await executeAgentInternally({
                  model: agentStep.model,
                  prompt: agentPrompt,
                  sessionId: sessionId as Id<"chatSessions">,
                  agentIndex: mention.agentIndex,
                });

                // Update the existing agent step with the new response
                await convex.mutation(api.mutations.updateAgentStep, {
                  stepId: agentStep._id,
                  response: agentResponse,
                  isComplete: true,
                  isStreaming: false,
                });

                // Clear the working status from streamed content
                await convex.mutation(api.mutations.updateStreamedContent, {
                  stepId: agentStep._id,
                  content: "",
                });

                // Update agent's conversation history directly
                await convex.mutation(api.mutations.appendAgentConversation, {
                  sessionId: sessionId as Id<"chatSessions">,
                  agentIndex: mention.agentIndex,
                  userPrompt: mention.taskPrompt, // User-facing task, not internal prompt
                  agentResponse: agentResponse,
                  triggeredBy: "supervisor",
                });

                // Store reference for supervisor turn
                executedAgentUpdates.push({
                  agentIndex: mention.agentIndex,
                  userFacingTask: mention.taskPrompt,
                  responsePreview: agentResponse.slice(0, 200),
                });

                // Send agent completion signal
                const agentCompleteData = JSON.stringify({
                  type: "agent_execution_complete",
                  agentName: mention.agentName,
                  agentIndex: mention.agentIndex,
                  responsePreview: agentResponse.slice(0, 100),
                });
                controller.enqueue(
                  new TextEncoder().encode(`data: ${agentCompleteData}\n\n`)
                );
              } catch (agentError) {
                console.error(
                  `Error executing agent ${mention.agentName}:`,
                  agentError
                );

                // Update agent step with error
                const agentStep = recentSteps[mention.agentIndex];
                await convex.mutation(api.mutations.updateAgentStep, {
                  stepId: agentStep._id,
                  error:
                    agentError instanceof Error
                      ? agentError.message
                      : "Unknown error",
                  isComplete: true,
                  isStreaming: false,
                });

                // Send agent error signal
                const agentErrorData = JSON.stringify({
                  type: "agent_execution_error",
                  agentName: mention.agentName,
                  agentIndex: mention.agentIndex,
                  error:
                    agentError instanceof Error
                      ? agentError.message
                      : "Unknown error",
                });
                controller.enqueue(
                  new TextEncoder().encode(`data: ${agentErrorData}\n\n`)
                );
              }
            }
          }

          // Complete supervisor turn
          await convex.mutation(api.mutations.updateSupervisorTurn, {
            turnId,
            supervisorResponse,
            parsedMentions: validMentions,
            executedStepIds: [], // No visible agent steps created
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
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Supervisor API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
