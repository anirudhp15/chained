import { GitCommitHorizontal, GitFork, GitCompareArrows } from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";

// Chain configuration
export const MAX_AGENTS_PER_CHAIN = 4;

// Connection types configuration
export type EnabledConnectionType = "direct" | "conditional" | "parallel";
export type AllConnectionType = EnabledConnectionType | "collaborative";

export const CONNECTION_TYPES = [
  {
    type: "direct" as const,
    label: "Direct",
    Icon: GitCommitHorizontal,
    description: "Pass previous agent's output directly",
    color: "text-blue-400",
  },
  {
    type: "conditional" as const,
    label: "Conditional",
    Icon: IoGitBranchOutline,
    description: "Run only if a condition is met",
    color: "text-amber-400",
    iconRotate: "rotate-90",
  },
  {
    type: "parallel" as const,
    label: "Parallel",
    Icon: GitFork,
    description: "Run simultaneously",
    color: "text-purple-400",
    iconRotate: "rotate-90",
  },
  {
    type: "collaborative" as const,
    label: "Collaborative",
    Icon: GitCompareArrows,
    description: "Agents work together iteratively",
    color: "text-green-400",
    disabled: true,
  },
] satisfies Array<{
  type: AllConnectionType;
  label: string;
  Icon: React.ComponentType<any>;
  description: string;
  disabled?: boolean;
  color: string;
  iconRotate?: string;
}>;

export const CONDITION_PRESETS = [
  {
    label: "Contains keyword",
    condition: "contains('keyword')",
    placeholder: "contains('error')",
  },
  {
    label: "Starts with",
    condition: "starts_with('text')",
    placeholder: "starts_with('SUCCESS')",
  },
  {
    label: "Ends with",
    condition: "ends_with('text')",
    placeholder: "ends_with('.')",
  },
  {
    label: "Length greater than",
    condition: "length > 100",
    placeholder: "length > 50",
  },
  {
    label: "Length less than",
    condition: "length < 100",
    placeholder: "length < 200",
  },
  {
    label: "Not empty",
    condition: "length > 0",
    placeholder: "length > 0",
  },
];

// Default agent configuration
export const DEFAULT_AGENT_CONFIG = {
  model: "gpt-4o",
  name: "",
  prompt: "",
  temperature: 0.5,
  max_tokens: 1000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

// Template definitions for quick-start prompts
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  primaryConnectionType: EnabledConnectionType | "mixed";
  agentCount: number;
  agents: Array<{
    name: string;
    prompt: string;
    model: string;
    connection?: {
      type: EnabledConnectionType;
      condition?: string;
    };
  }>;
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "content-pipeline",
    title: "Content Creation Pipeline",
    description: "Sequential content creation and optimization workflow",
    primaryConnectionType: "direct",
    agentCount: 2,
    agents: [
      {
        name: "Content Creator",
        prompt:
          "Create engaging, well-structured content based on the topic provided. Focus on clarity, flow, and compelling messaging.",
        model: "gpt-4o",
      },
      {
        name: "Content Optimizer",
        prompt:
          "Review and optimize the content for SEO, readability, and engagement. Suggest improvements for headlines, structure, and call-to-actions.",
        model: "claude-3-5-sonnet-20241022",
        connection: {
          type: "direct",
        },
      },
    ],
  },
  {
    id: "smart-review",
    title: "Smart Content Review",
    description:
      "Conditional workflow that routes content based on quality assessment",
    primaryConnectionType: "conditional",
    agentCount: 3,
    agents: [
      {
        name: "Content Analyzer",
        prompt:
          "Analyze the provided content for quality, clarity, and completeness. Rate it on a scale of 1-10 and identify any major issues.",
        model: "gpt-4o",
      },
      {
        name: "Content Improver",
        prompt:
          "Improve the content by addressing the issues identified. Focus on enhancing clarity, structure, and engagement.",
        model: "claude-3-5-sonnet-20241022",
        connection: {
          type: "conditional",
          condition: "contains('Rating: [1-6]')",
        },
      },
      {
        name: "Final Formatter",
        prompt:
          "Apply final formatting, polish the language, and ensure consistent style throughout the content.",
        model: "gpt-4o",
        connection: {
          type: "direct",
        },
      },
    ],
  },
  {
    id: "multi-perspective",
    title: "Multi-Perspective Analysis",
    description: "Parallel analysis from different expert viewpoints",
    primaryConnectionType: "parallel",
    agentCount: 3,
    agents: [
      {
        name: "Technical Expert",
        prompt:
          "Analyze from a technical perspective, focusing on feasibility, implementation challenges, and technical requirements.",
        model: "gpt-4o",
      },
      {
        name: "Business Analyst",
        prompt:
          "Evaluate from a business perspective, considering market viability, costs, benefits, and strategic alignment.",
        model: "claude-3-5-sonnet-20241022",
        connection: {
          type: "parallel",
        },
      },
      {
        name: "Synthesis Expert",
        prompt:
          "Synthesize the technical and business analyses into actionable recommendations with clear next steps.",
        model: "gpt-4o",
        connection: {
          type: "direct",
        },
      },
    ],
  },
  {
    id: "research-chain",
    title: "Complex Research Chain",
    description:
      "Multi-stage research with conditional routing and parallel analysis",
    primaryConnectionType: "mixed",
    agentCount: 4,
    agents: [
      {
        name: "Research Planner",
        prompt:
          "Create a comprehensive research plan, identifying key areas to investigate and research questions to answer.",
        model: "gpt-4o",
      },
      {
        name: "Data Gatherer",
        prompt:
          "Gather relevant information and data based on the research plan. Focus on finding credible sources and key insights.",
        model: "claude-3-5-sonnet-20241022",
        connection: {
          type: "direct",
        },
      },
      {
        name: "Critical Analyzer",
        prompt:
          "Critically analyze the gathered data for accuracy, relevance, and potential biases. Identify gaps or areas needing deeper investigation.",
        model: "gpt-4o",
        connection: {
          type: "conditional",
          condition: "length > 100",
        },
      },
      {
        name: "Report Generator",
        prompt:
          "Compile all research into a comprehensive, well-structured report with clear conclusions and recommendations.",
        model: "claude-3-5-sonnet-20241022",
        connection: {
          type: "direct",
        },
      },
    ],
  },
];
