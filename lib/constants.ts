import { GitCommitHorizontal, GitFork, GitCompareArrows } from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";
import { SiOpenai, SiClaude, SiGoogle } from "react-icons/si";
import { GrokIcon } from "./grok-icon";
import React from "react";

// Model Provider Types
export interface ModelConfig {
  value: string;
  label: string;
  modalities: string[];
  description?: string;
  capabilities?: string[];
}

export interface ModelProvider {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
  models: ModelConfig[];
}

export interface ModelProviders {
  openai: ModelProvider;
  anthropic: ModelProvider;
  xai: ModelProvider;
  google: ModelProvider;
}

// Centralized Model Providers Configuration
export const MODEL_PROVIDERS: ModelProviders = {
  openai: {
    name: "OpenAI",
    icon: SiOpenai,
    iconColor: "text-white",
    bgColor: "bg-[#000000]",
    models: [
      // Flagship Models (Sweet Spot)
      {
        value: "gpt-4o",
        label: "ChatGPT 4o",
        modalities: ["text", "vision", "audio", "code"],
        description: "Flagship multimodal model with real-time capabilities",
        capabilities: [
          "Real-time reasoning",
          "Voice interaction",
          "Image analysis",
        ],
      },
      {
        value: "gpt-4o-mini",
        label: "ChatGPT 4o Mini",
        modalities: ["text", "vision", "fast"],
        description: "Fast and cost-effective multimodal model",
        capabilities: ["Quick responses", "Vision analysis", "Cost-efficient"],
      },

      // GPT 4.1 Series
      {
        value: "gpt-4.1",
        label: "ChatGPT 4.1",
        modalities: ["text", "vision", "code"],
        description: "Enhanced GPT-4 with improved capabilities",
        capabilities: [
          "Improved reasoning",
          "Better code generation",
          "Enhanced accuracy",
        ],
      },
    ],
  },

  anthropic: {
    name: "Anthropic",
    icon: SiClaude,
    iconColor: "text-[#da7756]",
    bgColor: "bg-[#000000]",
    models: [
      // Claude 4 Series (Latest Sweet Spot)
      {
        value: "claude-sonnet-4-20250514",
        label: "Claude Sonnet 4",
        modalities: ["text", "vision", "code"],
        description: "High-performance model with exceptional capabilities",
        capabilities: [
          "Advanced coding",
          "Complex analysis",
          "Vision analysis",
        ],
      },

      // Claude 3.7 Series
      {
        value: "claude-3-7-sonnet-20250219",
        label: "Claude Sonnet 3.7",
        modalities: ["text", "vision", "code"],
        description: "Enhanced model with extended thinking capabilities",
        capabilities: [
          "Extended thinking",
          "Deep analysis",
          "Thoughtful responses",
        ],
      },

      // Claude 3.5 Series (Proven Workhorses)
      {
        value: "claude-3-5-sonnet-20241022",
        label: "Claude 3.5 Sonnet",
        modalities: ["text", "vision", "code"],
        description: "Proven high-performance model for complex tasks",
        capabilities: ["Code generation", "Vision analysis", "Tool use"],
      },
      {
        value: "claude-3-5-haiku-20241022",
        label: "Claude 3.5 Haiku",
        modalities: ["text", "vision", "fast"],
        description: "Fast and efficient model for quick tasks",
        capabilities: [
          "Rapid responses",
          "Cost-effective",
          "Reliable performance",
        ],
      },
    ],
  },

  xai: {
    name: "xAI",
    icon: GrokIcon,
    iconColor: "text-white",
    bgColor: "bg-[#000000]",
    models: [
      // Grok 4 Series (Latest)
      {
        value: "grok-4-0709",
        label: "Grok 4",
        modalities: ["text", "vision", "web"],
        description: "Latest flagship model with real-time data access",
        capabilities: [
          "Real-time data",
          "Market analysis",
          "Deep domain knowledge",
        ],
      },

      // Grok 3 Series
      {
        value: "grok-3",
        label: "Grok 3",
        modalities: ["text", "vision", "web"],
        description: "Flagship model with real-time data access",
        capabilities: ["Real-time data", "Market analysis", "Web browsing"],
      },
      {
        value: "grok-3-mini-fast",
        label: "Grok 3 Mini Fast",
        modalities: ["text", "fast"],
        description: "Balance of speed and cost-effectiveness",
        capabilities: ["Fast responses", "Cost-efficient", "Reliable"],
      },
    ],
  },

  google: {
    name: "Google",
    icon: SiGoogle,
    iconColor: "text-white",
    bgColor: "bg-[#000000]",
    models: [
      // Gemini 2.5 Series (Latest)
      {
        value: "gemini-2.0-flash-exp",
        label: "Gemini 2.0 Flash Experimental",
        modalities: ["text", "vision", "code", "fast"],
        description:
          "Experimental fast multimodal model with cutting-edge features",
        capabilities: [
          "Ultra-fast responses",
          "Vision analysis",
          "Code generation",
        ],
      },

      // Gemini 1.5 Series
      {
        value: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        modalities: ["text", "vision", "code"],
        description: "High-performance multimodal model",
        capabilities: [
          "Advanced reasoning",
          "Long context window",
          "Vision analysis",
        ],
      },
      {
        value: "gemini-1.5-flash",
        label: "Gemini 1.5 Flash",
        modalities: ["text", "vision", "code", "fast"],
        description: "Fast and efficient multimodal model",
        capabilities: ["Quick responses", "Cost-effective", "Vision support"],
      },
    ],
  },
};

// Helper function to get provider from model name
export const getProviderKey = (modelValue: string): keyof ModelProviders => {
  if (
    modelValue.includes("gpt") ||
    modelValue.includes("o1") ||
    modelValue.includes("o3") ||
    modelValue.includes("o4")
  ) {
    return "openai";
  }
  if (modelValue.includes("claude")) {
    return "anthropic";
  }
  if (modelValue.includes("grok")) {
    return "xai";
  }
  if (modelValue.includes("gemini")) {
    return "google";
  }
  return "openai"; // Default fallback
};

// Helper function to get all allowed model values (for API validation)
export const getAllowedModels = (): string[] => {
  return Object.values(MODEL_PROVIDERS).flatMap((provider: ModelProvider) =>
    provider.models.map((model: ModelConfig) => model.value)
  );
};

// Helper function to check if a model supports reasoning (for future use)
export const isReasoningModel = (model: string): boolean => {
  // Preserved for future reasoning model support
  return model.includes("o1") || model.includes("o3") || model.includes("o4");
};

// Chain configuration
export const MAX_AGENTS_PER_CHAIN = 4;

// Connection types configuration
export type EnabledConnectionType =
  | "direct"
  | "conditional"
  | "parallel"
  | "collaborative";
export type AllConnectionType = EnabledConnectionType;

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
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
] satisfies Array<{
  type: AllConnectionType;
  label: string;
  Icon: React.ComponentType<any>;
  description: string;
  disabled?: boolean;
  color: string;
  iconRotate?: string;
  bgColor?: string;
  borderColor?: string;
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
