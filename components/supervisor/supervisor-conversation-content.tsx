"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageBubble } from "../chat/message-bubble";
import { ChainProgress } from "../performance/chain-progress";
import { CopyButton } from "../ui/CopyButton";
import { CollapsibleAgentExecution } from "./supervisor-interface";

// Helper function to generate complete content for copying
function generateCompleteContent(
  supervisorResponse: string,
  parsedMentions: any[],
  agentSteps: any[]
): string {
  let completeContent = `**Supervisor Response:**\n${supervisorResponse}`;

  if (parsedMentions && parsedMentions.length > 0) {
    completeContent += "\n\n**Agent Executions:**\n";

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

interface SupervisorConversationContentProps {
  supervisorTurns: any[] | undefined;
  supervisorStreamContent?: { [turnId: string]: string };
  agentSteps?: any[] | undefined;
  useMotion?: boolean; // Whether to use motion animations (for modal)
  className?: string;
}

export function SupervisorConversationContent({
  supervisorTurns,
  supervisorStreamContent = {},
  agentSteps,
  useMotion = false,
  className = "",
}: SupervisorConversationContentProps) {
  // Show chain progress when there are no supervisor turns but there are agent steps
  if (
    (!supervisorTurns || supervisorTurns.length === 0) &&
    agentSteps &&
    agentSteps.length > 0
  ) {
    const content = (
      <div className="px-8 py-8">
        <ChainProgress agentSteps={agentSteps} />
      </div>
    );

    return useMotion ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    ) : (
      content
    );
  }

  // Show welcome message when there are no supervisor turns and no agent steps
  if (!supervisorTurns || supervisorTurns.length === 0) {
    const welcomeContent = (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <h3 className="text-xl font-normal text-gray-200 mb-6">Supervisor</h3>
          <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
            Coordinate your agents by mentioning them in your messages.
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>"@Agent1 analyze this data"</p>
            <p>"@Agent2 summarize the findings"</p>
            <p>"@Agent1 @Agent2 collaborate"</p>
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
      {supervisorTurns.map((turn, index) => (
        <div key={turn._id} className="space-y-8 text-xs lg:text-sm">
          {/* User Message */}
          <MessageBubble content={turn.userInput} isUser={true} />

          <div className="group/message-bubble">
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
                {/* Agent Executions */}
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
                    <div className="mt-2 flex opacity-0 group-hover/message-bubble:opacity-100 transition-opacity duration-200 justify-start">
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
