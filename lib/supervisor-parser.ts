export interface MentionTask {
  agentIndex: number;
  agentName: string;
  taskPrompt: string;
}

export interface AgentStep {
  index: number;
  name?: string;
  model: string;
  response?: string;
  isComplete: boolean;
}

export interface ParsedSupervisorPrompt {
  mentions: MentionTask[];
  generalPrompt: string;
  hasMentions: boolean;
}

export function parseSupervisorPrompt(
  userInput: string,
  agentSteps: AgentStep[]
): ParsedSupervisorPrompt {
  const mentions: MentionTask[] = [];
  let generalPrompt = userInput;

  // Create agent name mapping for flexible matching
  const agentNameMap = new Map<string, number>();
  agentSteps.forEach((step, index) => {
    const agentName = step.name || `Agent ${index + 1}`;
    const stepNumber = `Agent ${index + 1}`;
    const stepNumberShort = `Agent${index + 1}`;
    const stepIndex = `${index + 1}`;

    // Map various name formats to the same agent
    agentNameMap.set(agentName.toLowerCase(), index);
    agentNameMap.set(stepNumber.toLowerCase(), index);
    agentNameMap.set(stepNumberShort.toLowerCase(), index);
    agentNameMap.set(stepIndex, index);

    // Also map by model name if unique
    const modelCount = agentSteps.filter((s) => s.model === step.model).length;
    if (modelCount === 1) {
      agentNameMap.set(step.model.toLowerCase(), index);
    }
  });

  // Enhanced @mention regex that captures the task after the mention
  const mentionRegex = /@(\w+(?:\s+\w+)*)/gi;
  let match;
  const processedMentions = new Set<number>();

  while ((match = mentionRegex.exec(userInput)) !== null) {
    const mentionText = match[1].toLowerCase().trim();
    const agentIndex = agentNameMap.get(mentionText);

    if (agentIndex !== undefined && !processedMentions.has(agentIndex)) {
      processedMentions.add(agentIndex);

      // Extract task context around the mention
      const mentionStart = match.index;
      const mentionEnd = match.index + match[0].length;

      // Look for task description after the mention
      const afterMention = userInput.substring(mentionEnd);
      const taskMatch = afterMention.match(/^[^@]*?(?=@|$)/);
      const taskText = taskMatch ? taskMatch[0].trim() : "";

      // Clean up task text (remove common separators)
      const cleanTask = taskText
        .replace(/^[,:\s]+/, "") // Remove leading punctuation
        .replace(/[,\s]+$/, "") // Remove trailing punctuation
        .trim();

      const agentName =
        agentSteps[agentIndex]?.name || `Agent ${agentIndex + 1}`;

      mentions.push({
        agentIndex,
        agentName,
        taskPrompt: cleanTask || extractImplicitTask(userInput, agentName),
      });
    }
  }

  // If no mentions found, try to infer from context
  if (mentions.length === 0) {
    const inferredMention = inferAgentFromContext(userInput, agentSteps);
    if (inferredMention) {
      mentions.push(inferredMention);
    }
  }

  return {
    mentions,
    generalPrompt: generalPrompt.trim(),
    hasMentions: mentions.length > 0,
  };
}

function extractImplicitTask(userInput: string, agentName: string): string {
  // Extract task when mention doesn't have explicit task description
  const commonTaskPatterns = [
    /improve|enhance|refine|update|revise/i,
    /analyze|review|examine|evaluate/i,
    /create|generate|write|draft/i,
    /summarize|explain|clarify/i,
  ];

  for (const pattern of commonTaskPatterns) {
    if (pattern.test(userInput)) {
      return userInput;
    }
  }

  return `Continue working on your previous task`;
}

function inferAgentFromContext(
  userInput: string,
  agentSteps: AgentStep[]
): MentionTask | null {
  // If user mentions specific capabilities or models, try to match
  const lowerInput = userInput.toLowerCase();

  // Look for model names
  for (const step of agentSteps) {
    if (lowerInput.includes(step.model.toLowerCase())) {
      return {
        agentIndex: step.index,
        agentName: step.name || `Agent ${step.index + 1}`,
        taskPrompt: userInput,
      };
    }
  }

  // Look for capability keywords
  const capabilityMap = {
    analyze: ["gpt-4", "claude"],
    write: ["gpt-4", "claude"],
    code: ["gpt-4", "claude"],
    image: ["gpt-4-vision", "claude-3"],
    creative: ["gpt-4", "claude"],
  };

  for (const [capability, models] of Object.entries(capabilityMap)) {
    if (lowerInput.includes(capability)) {
      const matchingAgent = agentSteps.find((step) =>
        models.some((model) => step.model.toLowerCase().includes(model))
      );

      if (matchingAgent) {
        return {
          agentIndex: matchingAgent.index,
          agentName: matchingAgent.name || `Agent ${matchingAgent.index + 1}`,
          taskPrompt: userInput,
        };
      }
    }
  }

  return null;
}

export function buildAgentTaskPrompt(
  originalTask: string,
  chainContext: string,
  agentHistory: string,
  userPrompt: string
): string {
  // Build comprehensive context for agent execution
  let prompt = "";

  if (agentHistory) {
    prompt += `Previous conversation with this agent:\n${agentHistory}\n\n`;
  }

  if (chainContext) {
    prompt += `Chain context from other agents:\n${chainContext}\n\n`;
  }

  prompt += `Supervisor instruction: ${userPrompt}\n\n`;

  if (originalTask && originalTask !== userPrompt) {
    prompt += `Specific task: ${originalTask}\n\n`;
  }

  prompt += `Please respond to the supervisor's instruction, taking into account your previous work and the context from other agents.`;

  return prompt;
}

export function buildSupervisorPrompt(
  userInput: string,
  agentSteps: AgentStep[],
  supervisorHistory: string = ""
): string {
  let prompt = `You are a helpful supervisor coordinating a multi-agent chain. Your role is to:

1. Provide conversational responses about the chain's progress and capabilities
2. Help users understand what each agent can do
3. Coordinate agent tasks when users mention specific agents with @mentions

Current chain overview:
`;

  // Add simplified agent summaries (no internal details)
  agentSteps.forEach((step, index) => {
    const agentName = step.name || `Agent ${index + 1}`;
    const status = step.isComplete ? "Ready" : "Working";

    prompt += `- ${agentName}: ${step.model} (${status})\n`;
  });

  if (supervisorHistory) {
    prompt += `\nRecent conversation:\n${supervisorHistory}\n\n`;
  }

  prompt += `User message: "${userInput}"

Guidelines for your response:
- Be conversational and helpful
- If users mention agents with @mentions, acknowledge that you'll coordinate with those agents
- Don't expose internal prompts or technical details
- Focus on being a friendly coordinator who helps users interact with the chain
- Keep responses concise and natural

Respond as a helpful supervisor who understands the user's needs and can coordinate the agent chain effectively.`;

  return prompt;
}

export function validateAgentMentions(
  mentions: MentionTask[],
  agentSteps: AgentStep[]
): { valid: MentionTask[]; invalid: string[] } {
  const valid: MentionTask[] = [];
  const invalid: string[] = [];

  mentions.forEach((mention) => {
    if (mention.agentIndex >= 0 && mention.agentIndex < agentSteps.length) {
      valid.push(mention);
    } else {
      invalid.push(mention.agentName);
    }
  });

  return { valid, invalid };
}
