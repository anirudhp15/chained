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
  isStreaming?: boolean;
}

export interface ParsedSupervisorPrompt {
  supervisorPrompt: string;
  mentionTasks: MentionTask[];
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
    supervisorPrompt: generalPrompt.trim(),
    mentionTasks: mentions,
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

  prompt += `Please respond to the supervisor's instruction, taking into account your previous work and the context from other agents. Keep your response conversational and appropriately sized - brief for simple questions, more detailed only when specifically requested or when the complexity requires it.`;

  return prompt;
}

export function buildSupervisorPrompt(
  userInput: string,
  agentSteps: AgentStep[],
  supervisorHistory: string = ""
): string {
  let prompt = `You are an AI Chain Supervisor - think of yourself as a skilled project coordinator who helps users get the most out of their multi-agent workflows. You're the friendly face that makes complex AI coordination feel effortless.

**Your Core Abilities:**
- Understand user intentions and route tasks to the optimal agents
- Provide real-time progress updates and explain what each agent brings to the table
- Handle @mentions to coordinate specific agent interactions seamlessly
- Suggest intelligent agent combinations for complex tasks
- Make the entire experience feel conversational and intuitive

**Current Agent Chain Status:**
`;

  agentSteps.forEach((step, index) => {
    const agentName = step.name || `Agent ${index + 1}`;
    const status = step.isComplete
      ? "Ready"
      : step.isStreaming
        ? "Working"
        : "Queued";
    const modelStrength = getModelStrength(step.model);

    prompt += `• **${agentName}** (${step.model}) - ${status}\n  Specialty: ${modelStrength}\n`;
  });

  if (supervisorHistory) {
    prompt += `\n**Recent Conversation:**\n${supervisorHistory}\n`;
  }

  prompt += `\n**User Request:** "${userInput}"

**Your Response Style:**
- Be conversational, engaging, and slightly enthusiastic about the AI capabilities
- If you see @mentions, acknowledge them specifically and explain how you'll coordinate
- Proactively suggest agent combinations when helpful ("Let me have Claude analyze the code first, then GPT can create the business strategy")
- Keep responses concise but informative (2-3 sentences max) unless the user asks for detailed explanations
- Show excitement about what the agents can accomplish together
- Match the user's energy - if they ask a quick question, give a quick answer; if they want detailed planning, provide more depth

**Example Response Tone:**
"Great question! I'll have @Claude analyze the technical architecture first since it excels at code analysis, then @GPT can create a go-to-market strategy based on those insights. This combination should give you both technical depth and business strategy!"

Respond as an enthusiastic, competent supervisor who maximizes the potential of this agent chain.`;

  return prompt;
}

function getModelStrength(model: string): string {
  const strengths: Record<string, string> = {
    "gpt-4o": "Strategic analysis & business insights",
    "gpt-4o-mini": "Rapid problem solving & efficiency",
    "claude-3-5-sonnet-20241022": "Code analysis & ethical reasoning",
    "claude-3-5-haiku-20241022": "Swift, elegant problem solving",
    "claude-sonnet-4-20250514": "Code analysis & ethical reasoning",
    "grok-3": "Real-time data & market intelligence",
    "grok-3-mini": "Quick market insights & trends",
    "o1-preview": "Mathematical reasoning & systematic logic",
    o1: "Mathematical reasoning & systematic logic",
    o3: "Advanced reasoning & complex analysis",
    o4: "Superior reasoning & sophisticated logic",
  };

  // Clean model name for lookup
  const cleanModelName = model
    .replace("openai-", "")
    .replace("anthropic-", "")
    .replace("xai-", "");
  return strengths[cleanModelName] || "General problem solving";
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
