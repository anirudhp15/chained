// Template personalization logic
import type { PromptTemplate } from "./constants";

interface UserChain {
  title?: string;
  agentSteps?: Array<{
    prompt: string;
    model: string;
    connectionType?: string;
  }>;
}

interface PersonalizationAnalysis {
  preferredModels: string[];
  commonTopics: string[];
  connectionTypeUsage: Record<string, number>;
  averageChainLength: number;
}

// Keywords that indicate different domains/topics
const TOPIC_KEYWORDS = {
  content: [
    "content",
    "write",
    "writing",
    "blog",
    "article",
    "copy",
    "marketing",
    "seo",
  ],
  technical: [
    "code",
    "programming",
    "technical",
    "software",
    "development",
    "api",
    "function",
  ],
  research: [
    "research",
    "analyze",
    "study",
    "investigate",
    "data",
    "findings",
    "report",
  ],
  business: [
    "business",
    "strategy",
    "market",
    "analysis",
    "plan",
    "decision",
    "roi",
  ],
  creative: [
    "creative",
    "design",
    "brainstorm",
    "ideas",
    "innovative",
    "artistic",
  ],
  review: [
    "review",
    "feedback",
    "evaluate",
    "assess",
    "critique",
    "quality",
    "improvement",
  ],
} as const;

// Analyze user's recent chains to understand patterns
export function analyzeUserPatterns(
  recentChains: UserChain[]
): PersonalizationAnalysis {
  if (!recentChains || recentChains.length === 0) {
    return {
      preferredModels: [],
      commonTopics: [],
      connectionTypeUsage: {},
      averageChainLength: 0,
    };
  }

  const modelCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const connectionCounts: Record<string, number> = {};
  let totalAgents = 0;
  let totalChains = 0;

  recentChains.forEach((chain) => {
    if (!chain.agentSteps) return;

    totalChains++;
    totalAgents += chain.agentSteps.length;

    // Analyze models
    chain.agentSteps.forEach((step) => {
      if (step.model) {
        modelCounts[step.model] = (modelCounts[step.model] || 0) + 1;
      }

      if (step.connectionType) {
        connectionCounts[step.connectionType] =
          (connectionCounts[step.connectionType] || 0) + 1;
      }
    });

    // Analyze topics from chain title and prompts
    const allText = [
      chain.title || "",
      ...chain.agentSteps.map((step) => step.prompt),
    ]
      .join(" ")
      .toLowerCase();

    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      const matches = keywords.filter((keyword) =>
        allText.includes(keyword)
      ).length;
      if (matches > 0) {
        topicCounts[topic] = (topicCounts[topic] || 0) + matches;
      }
    });
  });

  // Sort and get top preferences
  const preferredModels = Object.entries(modelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([model]) => model);

  const commonTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([topic]) => topic);

  return {
    preferredModels,
    commonTopics,
    connectionTypeUsage: connectionCounts,
    averageChainLength:
      totalChains > 0 ? Math.round(totalAgents / totalChains) : 0,
  };
}

// Generate personalized templates based on user patterns
export function generatePersonalizedTemplates(
  analysis: PersonalizationAnalysis,
  defaultTemplates: PromptTemplate[]
): PromptTemplate[] {
  if (analysis.commonTopics.length === 0) {
    return defaultTemplates;
  }

  const personalizedTemplates: PromptTemplate[] = [];

  // Prioritize templates based on user's common topics
  analysis.commonTopics.forEach((topic) => {
    const relevantTemplate = getTemplateForTopic(topic, analysis);
    if (relevantTemplate) {
      personalizedTemplates.push(relevantTemplate);
    }
  });

  // Fill remaining slots with default templates that weren't already added
  const usedTemplateIds = new Set(personalizedTemplates.map((t) => t.id));
  const remainingDefaults = defaultTemplates.filter(
    (t) => !usedTemplateIds.has(t.id)
  );

  // Ensure we always have exactly 4 templates
  while (personalizedTemplates.length < 4 && remainingDefaults.length > 0) {
    personalizedTemplates.push(remainingDefaults.shift()!);
  }

  // If we still need more templates, duplicate from what we have
  while (personalizedTemplates.length < 4) {
    personalizedTemplates.push(
      defaultTemplates[personalizedTemplates.length % defaultTemplates.length]
    );
  }

  return personalizedTemplates.slice(0, 4);
}

// Get a template tailored to a specific topic
function getTemplateForTopic(
  topic: string,
  analysis: PersonalizationAnalysis
): PromptTemplate | null {
  const preferredModel = analysis.preferredModels[0] || "gpt-4o";
  const secondaryModel =
    analysis.preferredModels[1] || "claude-3-5-sonnet-20241022";

  switch (topic) {
    case "content":
      return {
        id: `personalized-content-${Date.now()}`,
        title: "Your Content Workflow",
        description:
          "Personalized content creation based on your previous chains",
        primaryConnectionType: "direct",
        agentCount: 2,
        agents: [
          {
            name: "Content Creator",
            prompt:
              "Create engaging content based on the topic provided, following the style and approach from your successful previous content.",
            model: preferredModel,
          },
          {
            name: "Content Optimizer",
            prompt:
              "Review and optimize the content for your specific audience and goals, applying insights from your content strategy.",
            model: secondaryModel,
            connection: { type: "direct" },
          },
        ],
      };

    case "technical":
      return {
        id: `personalized-technical-${Date.now()}`,
        title: "Your Technical Analysis",
        description:
          "Technical workflow adapted from your coding and development patterns",
        primaryConnectionType: "conditional",
        agentCount: 3,
        agents: [
          {
            name: "Technical Analyzer",
            prompt:
              "Analyze the technical requirements and challenges, drawing from your development experience.",
            model: preferredModel,
          },
          {
            name: "Solution Architect",
            prompt:
              "Design a technical solution based on the analysis, considering your preferred technologies and approaches.",
            model: secondaryModel,
            connection: {
              type: "conditional",
              condition: "contains('requirements')",
            },
          },
          {
            name: "Implementation Guide",
            prompt:
              "Create actionable implementation steps tailored to your technical workflow and preferences.",
            model: preferredModel,
            connection: { type: "direct" },
          },
        ],
      };

    case "research":
      return {
        id: `personalized-research-${Date.now()}`,
        title: "Your Research Method",
        description:
          "Research workflow based on your analysis and investigation patterns",
        primaryConnectionType: "parallel",
        agentCount: 3,
        agents: [
          {
            name: "Research Coordinator",
            prompt:
              "Plan research strategy based on your proven research methodologies and focus areas.",
            model: preferredModel,
          },
          {
            name: "Data Analyst",
            prompt:
              "Gather and analyze data using your preferred research techniques and criteria.",
            model: secondaryModel,
            connection: { type: "parallel" },
          },
          {
            name: "Insight Synthesizer",
            prompt:
              "Synthesize findings into actionable insights following your research reporting style.",
            model: preferredModel,
            connection: { type: "direct" },
          },
        ],
      };

    case "business":
      return {
        id: `personalized-business-${Date.now()}`,
        title: "Your Business Process",
        description:
          "Business analysis workflow matching your strategic thinking patterns",
        primaryConnectionType: "mixed",
        agentCount: 4,
        agents: [
          {
            name: "Business Strategist",
            prompt:
              "Analyze business opportunity following your strategic framework and decision-making process.",
            model: preferredModel,
          },
          {
            name: "Market Analyst",
            prompt:
              "Evaluate market conditions and competitive landscape using your business analysis approach.",
            model: secondaryModel,
            connection: { type: "direct" },
          },
          {
            name: "Risk Assessor",
            prompt:
              "Identify and evaluate risks based on your business experience and risk tolerance.",
            model: preferredModel,
            connection: {
              type: "conditional",
              condition: "contains('opportunity')",
            },
          },
          {
            name: "Decision Synthesizer",
            prompt:
              "Compile analysis into actionable business recommendations aligned with your goals.",
            model: secondaryModel,
            connection: { type: "direct" },
          },
        ],
      };

    default:
      return null;
  }
}
