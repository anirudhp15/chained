"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Brain,
  Code,
  MessageSquare,
  Lightbulb,
  Search,
  BarChart3,
  FileText,
  Bug,
  Smartphone,
  Database,
  PenTool,
  BookOpen,
  Video,
} from "lucide-react";
import type { Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";

interface WelcomeScreenProps {
  onLoadPreset: (agents: Agent[]) => void;
}

interface PresetChain {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  bgGradient: string;
  agents: Omit<Agent, "id">[];
}

interface ColumnTheme {
  title: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  presets: PresetChain[];
}

const RESEARCH_PRESETS: PresetChain[] = [
  {
    id: "market-research",
    title: "Market Research",
    description: "Analyze market trends, competitors, and opportunities",
    icon: Search,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Research the current market landscape for [INDUSTRY/PRODUCT]. Include market size, key players, trends, and growth opportunities.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Analyze the competitive landscape from the research. Identify main competitors, their strengths/weaknesses, market positioning, and gaps in the market.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Create a strategic market entry report with actionable recommendations, target segments, and key success factors based on the analysis.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "data-analysis",
    title: "Data Analysis",
    description: "Process data, identify patterns, and generate insights",
    icon: BarChart3,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Analyze the provided dataset for [DATA TYPE]. Identify key patterns, trends, anomalies, and statistical insights. Provide initial findings.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Deep dive into the most significant patterns identified. Explore correlations, segment the data, and uncover hidden relationships or insights.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Create a comprehensive data report with visualizations recommendations, key metrics, and actionable business insights from the analysis.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "academic-research",
    title: "Academic Research",
    description: "Literature review, analysis, and academic paper outline",
    icon: FileText,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Conduct a comprehensive literature review on [RESEARCH TOPIC]. Find key studies, theories, methodologies, and identify research gaps.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Analyze the literature to synthesize findings, compare different approaches, and develop a theoretical framework for the research topic.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o",
        prompt:
          "Create a detailed research paper outline with methodology, expected results, and academic citations based on the literature analysis.",
        connection: { type: "direct" },
      },
    ],
  },
];

const CODING_PRESETS: PresetChain[] = [
  {
    id: "feature-development",
    title: "Feature Development",
    description: "Plan, implement, and test out a new feature",
    icon: Code,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Plan the implementation for [FEATURE]. Break down requirements, suggest architecture, define API contracts, and create a development roadmap.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Write clean, well-documented code implementing the planned feature. Include proper error handling, validation, and follow best practices.",
        connection: { type: "direct" },
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Create comprehensive tests for the feature and review the code for improvements, security issues, and optimization opportunities.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "bug-debugging",
    title: "Bug Analysis & Fix",
    description: "Identify, analyze, and resolve code issues",
    icon: Bug,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Analyze the bug report for [ISSUE]. Examine the code, reproduce the problem, and identify the root cause and affected components.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Develop a fix for the identified bug. Ensure the solution is robust, doesn't introduce new issues, and handles edge cases properly.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Create test cases to verify the fix works and document the solution with prevention strategies for similar future issues.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "app-architecture",
    title: "App Architecture",
    description: "Design system architecture and database schema",
    icon: Database,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Design the overall architecture for [APPLICATION TYPE]. Include system components, data flow, technology stack recommendations, and scalability considerations.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Create detailed database schema and API design. Define entities, relationships, endpoints, and data validation rules based on the architecture.",
        connection: { type: "direct" },
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Review the architecture for security, performance, and maintainability. Suggest improvements and create implementation guidelines.",
        connection: { type: "direct" },
      },
    ],
  },
];

const CREATIVE_PRESETS: PresetChain[] = [
  {
    id: "story-writing",
    title: "Story Writing",
    description: "Brainstorm, outline, and write compelling narratives",
    icon: PenTool,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Brainstorm creative story ideas for [GENRE/THEME]. Generate unique concepts with compelling characters, interesting settings, and potential plot twists.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Develop the best story idea into a detailed outline. Include character arcs, plot structure, key scenes, and thematic elements.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o",
        prompt:
          "Write an engaging opening chapter based on the outline. Focus on strong character introduction, vivid setting, and compelling hook.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "content-creation",
    title: "Content Strategy",
    description: "Plan, create, and optimize engaging content",
    icon: BookOpen,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Develop a content strategy for [PLATFORM/AUDIENCE]. Include content pillars, posting schedule, engagement tactics, and growth strategies.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Create engaging content pieces based on the strategy. Write posts, captions, and copy that resonates with the target audience and drives engagement.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Optimize the content for performance. Suggest improvements, hashtag strategies, posting times, and metrics to track success.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "script-writing",
    title: "Script Writing",
    description: "Create scripts for videos, presentations, or podcasts",
    icon: Video,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Plan the structure and key messages for [SCRIPT TYPE] about [TOPIC]. Define the target audience, tone, duration, and main talking points.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Write the full script with engaging dialogue, smooth transitions, and clear call-to-actions. Include timing cues and production notes.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Polish the script for flow and impact. Optimize pacing, improve clarity, and suggest visual elements or delivery tips.",
        connection: { type: "direct" },
      },
    ],
  },
];

const COLUMN_THEMES: ColumnTheme[] = [
  {
    title: "Research",
    icon: Brain,
    iconColor: "text-blue-400",
    presets: RESEARCH_PRESETS,
  },
  {
    title: "Coding",
    icon: Code,
    iconColor: "text-green-400",
    presets: CODING_PRESETS,
  },
  {
    title: "Creative",
    icon: Lightbulb,
    iconColor: "text-yellow-400",
    presets: CREATIVE_PRESETS,
  },
];

export function WelcomeScreen({ onLoadPreset }: WelcomeScreenProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetClick = (preset: PresetChain) => {
    setSelectedPreset(preset.id);

    // Convert preset agents to full Agent objects with IDs
    const agentsWithIds: Agent[] = preset.agents.map((agent) => ({
      ...agent,
      id: uuidv4(),
    }));

    // Small delay for animation effect
    setTimeout(() => {
      onLoadPreset(agentsWithIds);
      setSelectedPreset(null);
    }, 200);
  };

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="max-w-7xl mx-auto text-center space-y-8">
        {/* Welcome Message */}
        <div className="space-y-4 welcome-fade-in">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl lg:text-5xl font-bold text-white">
              What tasks would you like to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lavender-400 to-purple-400">
                chain
              </span>{" "}
              today?
            </h1>
          </div>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Choose from these expertly crafted agent workflows
          </p>
        </div>

        {/* Themed Columns */}
        <div
          className="grid lg:grid-cols-3 gap-8 welcome-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {COLUMN_THEMES.map((theme, columnIndex) => (
            <div key={theme.title} className="space-y-6">
              {/* Column Header */}
              <div
                className="flex items-center justify-center gap-3 welcome-slide-up"
                style={{ animationDelay: `${0.3 + columnIndex * 0.1}s` }}
              >
                <theme.icon size={24} className={`${theme.iconColor}`} />
                <h2 className="text-xl font-semibold text-white">
                  {theme.title}
                </h2>
              </div>

              {/* Presets in Column */}
              <div className="space-y-3">
                {theme.presets.map((preset, presetIndex) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    disabled={selectedPreset !== null}
                    className={`group relative p-4 rounded-xl border-2 preset-card-hover disabled:opacity-50 disabled:cursor-not-allowed w-full text-left ${
                      selectedPreset === preset.id
                        ? "border-lavender-400 bg-lavender-500/10 scale-105"
                        : "border-gray-700/50 hover:border-lavender-400/50 bg-gradient-to-br " +
                          preset.bgGradient
                    }`}
                    style={{
                      animationDelay: `${0.4 + columnIndex * 0.1 + presetIndex * 0.05}s`,
                    }}
                  >
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-lavender-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Content */}
                    <div className="relative flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="inline-flex p-2.5 rounded-lg bg-gray-800/50 border border-gray-600/50 group-hover:border-gray-500/50 transition-all duration-300">
                          <preset.icon
                            size={18}
                            className={`${preset.iconColor} group-hover:scale-110 transition-transform duration-300`}
                          />
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-white group-hover:text-lavender-300 transition-colors duration-300 truncate">
                                {preset.title}
                              </h3>

                              {/* Agent Count Badge */}
                              <div className="flex-shrink-0">
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-800/70 border border-gray-600/50 rounded-full text-xs text-gray-300 group-hover:border-lavender-400/50 group-hover:text-lavender-300 transition-all duration-300">
                                  <span>{preset.agents.length} Agents</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loading State */}
                    {selectedPreset === preset.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
                        <div className="flex items-center gap-2 text-lavender-400">
                          <Zap size={16} className="animate-pulse" />
                          <span className="text-sm font-medium">
                            Loading...
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Text */}
        <div
          className="text-center welcome-slide-up"
          style={{ animationDelay: "0.8s" }}
        >
          <p className="text-sm text-gray-500">
            Or start fresh by adding your own agents below
          </p>
        </div>
      </div>
    </div>
  );
}
