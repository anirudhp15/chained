"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageBubble } from "../chat/message-bubble";
import { ChainProgress } from "../performance/chain-progress";
import { CopyButton } from "../ui/CopyButton";
import { CopyReference } from "../ui/CopyReference";
import { CollapsibleAgentExecution } from "./supervisor-interface";

// Helper function to generate complete content for copying
function generateCompleteContent(
  supervisorResponse: string,
  parsedMentions: any[],
  agentSteps: any[]
): string {
  let completeContent = `**Supervisor Response:**\n${supervisorResponse}`;

  if (parsedMentions && parsedMentions.length > 0) {
    completeContent += "\n\n**LLM Executions:**\n";

    parsedMentions.forEach((mention, index) => {
      const agentStep = agentSteps?.find(
        (step) => step.index === mention.agentIndex
      );

      completeContent += `\n${index + 1}. **${mention.agentName}**\n`;
      completeContent += `   Task: ${mention.taskPrompt}\n`;

      if (agentStep) {
        if (agentStep.error) {
          completeContent += `   Status: Error\n   Error: ${agentStep.error}\n`;
        } else if (agentStep.response) {
          completeContent += `   Status: Complete\n   Response: ${agentStep.response}\n`;
        } else if (agentStep.streamedContent) {
          completeContent += `   Status: Complete\n   Response: ${agentStep.streamedContent}\n`;
        } else if (agentStep.isStreaming) {
          completeContent += `   Status: Working...\n`;
        } else {
          completeContent += `   Status: Pending\n`;
        }
      } else {
        completeContent += `   Status: Queued\n`;
      }
    });
  }

  return completeContent;
}

// Component to display user message with reference chips
function UserMessageWithReferences({
  userInput,
  references = [],
}: {
  userInput: string;
  references?: any[];
}) {
  // Don't render if this is an auto-welcome message (empty userInput)
  if (!userInput || userInput.trim() === "") {
    return null;
  }

  return (
    <div className="group/message-bubble max-w-[80%] ml-auto w-auto">
      <div className="ml-0 bg-neutral-900/50 border border-neutral-700/50 rounded-lg p-2">
        <p
          className={`text-white whitespace-pre-wrap leading-relaxed ${
            references && references.length > 0 ? "mb-1" : ""
          }`}
        >
          {userInput}
        </p>

        {/* Display reference chips if any */}
        {references && references.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-700/50">
            {references.map((ref, index) => (
              <CopyReference
                key={ref.id || index}
                reference={ref}
                onRemove={undefined} // No remove functionality in conversation display
                isCompact={true}
                showPreview={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SupervisorConversationContentProps {
  supervisorTurns: any[] | undefined;
  supervisorStreamContent?: { [turnId: string]: string };
  agentSteps?: any[] | undefined;
  onFocusAgent?: (agentIndex: number) => void;
  useMotion?: boolean; // Whether to use motion animations (for modal)
  className?: string;
}

export function SupervisorConversationContent({
  supervisorTurns,
  supervisorStreamContent = {},
  agentSteps,
  onFocusAgent,
  useMotion = false,
  className = "",
}: SupervisorConversationContentProps) {
  // Show LLM executions when there are no supervisor turns but there are agent steps
  const showInitialAgentExecutions =
    (!supervisorTurns || supervisorTurns.length === 0) &&
    agentSteps &&
    agentSteps.length > 0;

  if (showInitialAgentExecutions) {
    const initialContent = (
      <div className="space-y-4">
        {/* Initial LLM Executions */}
        <div className="space-y-3">
          <div className="group/message-bubble">
            <div className="flex items-center gap-2 py-3 text-gray-400">
              <div className="w-2 h-2 bg-lavender-400 rounded-full"></div>
              <span className="text-xs font-medium">Chain Initialization</span>
            </div>

            <div className="space-y-2">
              {agentSteps.map((agentStep, index) => {
                // Create a mock mention object for consistency with conversation UI
                const mockMention = {
                  agentIndex: index,
                  agentName: agentStep.name || `LLM ${index + 1}`,
                  taskPrompt:
                    agentStep.prompt || "Processing initial chain request...",
                };

                return (
                  <CollapsibleAgentExecution
                    key={index}
                    mention={mockMention}
                    agentStep={agentStep}
                    onFocus={onFocusAgent}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );

    return useMotion ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {initialContent}
      </motion.div>
    ) : (
      initialContent
    );
  }

  // Show welcome message when there are no supervisor turns and no agent steps
  if (!supervisorTurns || supervisorTurns.length === 0) {
    const welcomeContent = (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <h3 className="text-xl font-normal text-gray-200 mb-6">Supervisor</h3>
          <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
            Coordinate your LLMs by mentioning them in your messages.
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>"@LLM1 analyze this data"</p>
            <p>"@LLM2 summarize the findings"</p>
            <p>"@LLM1 @LLM2 collaborate"</p>
          </div>
        </div>
      </div>
    );

    return useMotion ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {welcomeContent}
      </motion.div>
    ) : (
      welcomeContent
    );
  }

  // Full conversation history with all turns
  const conversationContent = (
    <div className={`p-4 max-w-4xl mx-auto ${className}`}>
      <div className="text-xs lg:text-sm">
        {/* Show initial LLM executions if this is the first supervisor interaction */}
        {showInitialAgentExecutions && (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Initial LLM Executions
            </div>

            <div className="space-y-2">
              {agentSteps.map((agentStep, index) => {
                // Create a mock mention object for consistency with conversation UI
                const mockMention = {
                  agentIndex: index,
                  agentName: agentStep.name || `LLM ${index + 1}`,
                  taskPrompt:
                    agentStep.prompt || "Processing initial chain request...",
                };

                return (
                  <CollapsibleAgentExecution
                    key={index}
                    mention={mockMention}
                    agentStep={agentStep}
                    onFocus={onFocusAgent}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Supervisor conversation turns */}
        <div className="">
          {supervisorTurns.map((turn, index) => (
            <div key={turn._id}>
              {/* User Message */}
              <div className=" group/message-bubble">
                <UserMessageWithReferences
                  userInput={turn.userInput}
                  references={turn.references}
                />
                {(turn.supervisorResponse ||
                  supervisorStreamContent[turn._id]) &&
                  !turn.isStreaming && (
                    <div className="flex opacity-0 mt-2 group-hover/message-bubble:opacity-100 transition-opacity duration-200 justify-end">
                      <CopyButton
                        text={generateCompleteContent(
                          turn.supervisorResponse ||
                            supervisorStreamContent[turn._id] ||
                            "",
                          turn.parsedMentions || [],
                          agentSteps || []
                        )}
                        size="sm"
                        tooltipPosition="top"
                        sourceContext={{
                          sourceType: "supervisor-response",
                          sessionId: turn.sessionId,
                        }}
                      />
                    </div>
                  )}
              </div>

              <div className="group/message-bubble max-w-[80%] mr-auto">
                {/* Supervisor Response */}
                {(turn.supervisorResponse ||
                  turn.isStreaming ||
                  supervisorStreamContent[turn._id]) && (
                  <MessageBubble
                    content={turn.supervisorResponse || ""}
                    isStreaming={turn.isStreaming}
                    streamingContent={supervisorStreamContent[turn._id]}
                    copyable={false}
                  >
                    {/* LLM Executions */}
                    {turn.parsedMentions && turn.parsedMentions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {turn.parsedMentions.map(
                          (mention: any, mentionIndex: number) => {
                            // Find the corresponding agent step
                            const agentStep = agentSteps?.find(
                              (step) => step.index === mention.agentIndex
                            );

                            return (
                              <CollapsibleAgentExecution
                                key={mentionIndex}
                                mention={mention}
                                agentStep={agentStep}
                                onFocus={onFocusAgent}
                              />
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* Custom Copy Button for Everything */}
                    {(turn.supervisorResponse ||
                      supervisorStreamContent[turn._id]) &&
                      !turn.isStreaming && (
                        <div className="flex opacity-0 mt-2 group-hover/message-bubble:opacity-100 transition-opacity duration-200 justify-start">
                          <CopyButton
                            text={generateCompleteContent(
                              turn.supervisorResponse ||
                                supervisorStreamContent[turn._id] ||
                                "",
                              turn.parsedMentions || [],
                              agentSteps || []
                            )}
                            size="sm"
                            tooltipPosition="top"
                            sourceContext={{
                              sourceType: "supervisor-response",
                              sessionId: turn.sessionId,
                            }}
                          />
                        </div>
                      )}
                  </MessageBubble>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return useMotion ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {conversationContent}
    </motion.div>
  ) : (
    conversationContent
  );
}
