"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Brain,
  Code,
  MessageSquare,
  Lightbulb,
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

const PRESET_CHAINS: PresetChain[] = [
  {
    id: "research-analysis",
    title: "Research & Analysis",
    description: "Research a topic, analyze findings, and create a summary",
    icon: Brain,
    iconColor: "text-blue-400",
    bgGradient: "from-lavender-500/10 to-purple-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Research the latest developments in [TOPIC]. Provide comprehensive information including key trends, recent breakthroughs, and important statistics.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Analyze the research findings from the previous agent. Identify the most significant insights, potential implications, and areas that need further investigation.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Create a concise executive summary of the research and analysis. Include key takeaways, actionable insights, and recommendations in bullet points.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "creative-writing",
    title: "Creative Writing",
    description: "Brainstorm ideas, develop a story, and refine the narrative",
    icon: Lightbulb,
    iconColor: "text-yellow-400",
    bgGradient: "from-lavender-500/10 to-purple-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Brainstorm creative story ideas for [GENRE/THEME]. Generate 3-5 unique concepts with interesting characters, settings, and potential plot twists.",
        connection: undefined,
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Take the most promising story idea from the brainstorm and develop it into a detailed outline. Include character development, plot structure, and key scenes.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o",
        prompt:
          "Write the opening chapter or scene based on the outline. Focus on engaging the reader, establishing the tone, and introducing key characters compellingly.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "code-review",
    title: "Code Development",
    description: "Plan a feature, write code, and review for improvements",
    icon: Code,
    iconColor: "text-green-400",
    bgGradient: "from-lavender-500/10 to-purple-500/10",
    agents: [
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Plan the implementation for [FEATURE/FUNCTIONALITY]. Break down the requirements, suggest the best approach, and outline the key components needed.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Write clean, well-documented code based on the implementation plan. Include proper error handling, comments, and follow best practices.",
        connection: { type: "direct" },
      },
      {
        model: "claude-3-5-sonnet-20241022",
        prompt:
          "Review the code for potential improvements, security issues, performance optimizations, and suggest any refactoring opportunities.",
        connection: { type: "direct" },
      },
    ],
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
      <div className="max-w-5xl mx-auto text-center space-y-12">
        {/* Welcome Message */}
        <div className="space-y-4 h-full welcome-fade-in">
          <div className="flex items-center justify-center gap-3 ">
            <h1 className="text-4xl lg:text-5xl font-bold text-white">
              Hi, what tasks would you like to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lavender-400 to-purple-400">
                chain
              </span>{" "}
              today?
            </h1>
          </div>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Get started with these popular agent chains
          </p>
        </div>

        {/* Preset Buttons */}
        <div
          className="grid md:grid-cols-3 gap-6 welcome-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {PRESET_CHAINS.map((preset, index) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              disabled={selectedPreset !== null}
              className={`group relative p-6 rounded-2xl border-2 preset-card-hover disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedPreset === preset.id
                  ? "border-lavender-400 bg-lavender-500/10 scale-105"
                  : "border-gray-700/50 hover:border-lavender-400/50 bg-gradient-to-br " +
                    preset.bgGradient
              }`}
              style={{
                animationDelay: `${0.3 + index * 0.1}s`,
              }}
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-lavender-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative space-y-4">
                {/* Icon */}
                <div
                  className={`inline-flex p-3 rounded-xl bg-gray-800/50 border border-gray-600/50 group-hover:border-gray-500/50 transition-all duration-300`}
                >
                  <preset.icon
                    size={24}
                    className={`${preset.iconColor} group-hover:scale-110 transition-transform duration-300`}
                  />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white group-hover:text-lavender-300 transition-colors duration-300">
                  {preset.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                  {preset.description}
                </p>

                {/* Agent Count Badge */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-800/70 border border-gray-600/50 rounded-full text-xs text-gray-300 group-hover:border-lavender-400/50 group-hover:text-lavender-300 transition-all duration-300">
                    <MessageSquare size={12} />
                    <span>{preset.agents.length} agents</span>
                  </div>
                </div>

                {/* Loading State */}
                {selectedPreset === preset.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-2xl">
                    <div className="flex items-center gap-2 text-lavender-400">
                      <Zap size={16} className="animate-pulse" />
                      <span className="text-sm font-medium">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer Text */}
        <div
          className="text-center welcome-slide-up"
          style={{ animationDelay: "0.6s" }}
        >
          <p className="text-sm text-gray-500">
            Or start fresh by adding your own agents below
          </p>
        </div>
      </div>
    </div>
  );
}
