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
  // Simplified prompt that focuses on the task without exposing orchestration
  let prompt = "";

  if (chainContext) {
    prompt += `Context:\n${chainContext}\n\n`;
  }

  prompt += `Task: ${userPrompt}\n\n`;

  if (originalTask && originalTask !== userPrompt) {
    prompt += `Additional details: ${originalTask}\n\n`;
  }

  prompt += `Please complete this task directly. Provide a clear, actionable response without mentioning other agents, coordination details, or your position in any workflow. Focus solely on delivering value for this specific request.`;

  return prompt;
}

export function buildSupervisorPrompt(
  userInput: string,
  agentSteps: AgentStep[],
  supervisorHistory: string = ""
): string {
  let prompt = `You are an AI Supervisor that seamlessly orchestrates multiple agents to complete user tasks. Your role is to act as an intelligent abstraction layer - the user should NOT see the internal coordination details.

**Core Principles:**
- Operate quietly in the background, like a skilled conductor
- NEVER expose agent names, numbers, or internal coordination to the user
- Present unified, coherent responses as if from a single intelligent system
- Only mention specific capabilities when directly relevant to the user's question

**Your Workflow:**
1. Understand the user's intent
2. Internally route to appropriate agents (DO NOT mention this routing)
3. Synthesize agent outputs into a single, polished response
4. Present the final result conversationally

**Internal Agent Status (for your reference only - DO NOT share with user):**
`;

  agentSteps.forEach((step, index) => {
    const agentName = step.name || `Agent ${index + 1}`;
    const status = step.isComplete
      ? "Ready"
      : step.isStreaming
        ? "Working"
        : "Queued";
    const modelStrength = getModelStrength(step.model);

    prompt += `• ${agentName} (${step.model}) - ${status} - ${modelStrength}\n`;
  });

  if (supervisorHistory) {
    prompt += `\n**Previous Context:**\n${supervisorHistory}\n`;
  }

  prompt += `\n**User Request:** "${userInput}"

**Response Guidelines:**
- If the user uses @mentions, acknowledge the task but DO NOT expose the routing
- Present results as your own analysis, not as "Agent X said..."
- Be helpful and conversational, matching the user's tone
- Keep internal orchestration completely hidden
- Only show progress if explicitly asked or if the task will take significant time

Example good response: "I'll analyze your code and create a business strategy for you. Let me work on that..."
Example bad response: "I'll have @Claude analyze the code first, then @GPT will create the strategy..."

Remember: You ARE the system, not a coordinator of visible agents.`;

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
