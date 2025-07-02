"use client";

import clsx from "clsx";
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
  ArrowLeft,
  Eye,
  X,
} from "lucide-react";
import type { Agent } from "../input/agent-input";
import { v4 as uuidv4 } from "uuid";
import { createPortal } from "react-dom";

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
    id: "investment-due-diligence",
    title: " Due Diligence",
    description:
      "Comprehensive company analysis from financials to competitive positioning",
    icon: BarChart3,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "grok-3",
        prompt:
          "Conduct comprehensive research on [COMPANY]. Pull real-time financial data, recent news, SEC filings, and market performance. Focus on: revenue trends, profitability, debt levels, management changes, and any material events from the past 12 months.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Analyze the financial and operational data to assess investment viability. Calculate key ratios (P/E, ROE, debt-to-equity, current ratio), evaluate business model sustainability, identify competitive advantages/moats, and assess management quality. Flag any red flags or concerns.",
        connection: { type: "direct" },
      },
      {
        model: "o1",
        prompt:
          "Create a comprehensive investment thesis with clear buy/hold/sell recommendation. Include target price range, key catalysts to watch, major risks, comparable company analysis, and specific entry/exit criteria. Format as an executive summary suitable for investment committee review.",
        connection: {
          type: "conditional",
          condition: "contains('profitable') or contains('positive cash flow')",
        },
      },
    ],
  },
  {
    id: "competitive-intelligence",
    title: "Competitive Intelligence",
    description: "Deep market analysis with actionable strategic insights",
    icon: Search,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "grok-3",
        prompt:
          "Research the competitive landscape for [INDUSTRY/MARKET]. Identify top 5-7 key players, their market share, recent product launches, funding rounds, partnerships, and strategic moves. Include emerging disruptors and analyze pricing strategies across the market.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Perform strategic analysis of competitive positioning. Create a detailed competitive matrix comparing features, pricing, target customers, and go-to-market strategies. Identify market gaps, white space opportunities, and potential partnership targets. Analyze each competitor's strengths, weaknesses, and likely next moves.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Synthesize findings into actionable strategic recommendations. Prioritize the top 3 market opportunities, suggest specific tactics to gain competitive advantage, and create a 90-day action plan with key initiatives and success metrics.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "technical-research-synthesis",
    title: "Technical Research",
    description:
      "Literature review with advanced synthesis for complex technical topics",
    icon: FileText,
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    agents: [
      {
        model: "o1",
        prompt:
          "Conduct comprehensive literature review on [TECHNICAL TOPIC]. Search for recent papers (2020-2024), identify key researchers and institutions, map the evolution of approaches, and summarize current state-of-the-art. Focus on methodologies, breakthrough results, and remaining challenges.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Synthesize the research into a coherent technical framework. Identify patterns across studies, compare methodological approaches, highlight conflicting findings, and develop a unified understanding. Create a technology readiness assessment and identify the most promising research directions.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4.5-preview",
        prompt:
          "Generate novel insights and research directions. Based on the synthesis, identify unexplored angles, propose specific research questions, suggest experimental approaches, and outline potential applications. Create a research roadmap with timeline and resource requirements.",
        connection: {
          type: "conditional",
          condition: "length > 1000 and contains('framework')",
        },
      },
    ],
  },
];

const CODING_PRESETS: PresetChain[] = [
  {
    id: "full-stack-feature-development",
    title: "Feature Development",
    description:
      "End-to-end feature development from architecture to deployment",
    icon: Code,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Design the complete architecture for [FEATURE]. Define database schema, API endpoints, frontend components, and data flow. Specify technology choices, consider scalability and security implications, create detailed technical specifications, and break down implementation into logical phases.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Implement the backend components with production-ready code. Include API routes, database models, validation logic, error handling, and security measures. Write clean, well-documented code following best practices with proper separation of concerns.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o",
        prompt:
          "Create comprehensive testing strategy and frontend implementation. Write unit tests, integration tests, and e2e test scenarios. Implement responsive UI components with proper state management, error handling, and user experience considerations. Include deployment scripts and monitoring setup.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "code-security-optimization",
    title: "Code Security",
    description:
      "Comprehensive code audit with performance and security improvements",
    icon: Bug,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Perform thorough security audit of the provided codebase. Identify vulnerabilities including SQL injection, XSS, CSRF, authentication flaws, and insecure dependencies. Check for secrets in code, improper access controls, and data exposure risks. Prioritize findings by severity.",
        connection: undefined,
      },
      {
        model: "gpt-4o",
        prompt:
          "Analyze code performance and architecture. Identify bottlenecks, memory leaks, inefficient algorithms, and scalability issues. Review database queries, API response times, and frontend rendering performance. Suggest specific optimizations with expected impact metrics.",
        connection: { type: "direct" },
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Implement security fixes and performance optimizations. Provide refactored code with security vulnerabilities patched, performance improvements implemented, and code quality enhanced. Include updated tests and documentation for all changes made.",
        connection: {
          type: "conditional",
          condition: "contains('vulnerability') or contains('performance')",
        },
      },
    ],
  },
  {
    id: "api-design-implementation",
    title: "API Design",
    description:
      "Design and build production-ready APIs with comprehensive documentation",
    icon: Database,
    iconColor: "text-green-400",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    agents: [
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Design RESTful API architecture for [APPLICATION]. Define resource models, endpoint structure, authentication strategy, rate limiting, and error handling patterns. Create OpenAPI specification with detailed schemas, response codes, and security requirements.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Implement the API with production-ready code. Include request validation, error handling, logging, monitoring, and comprehensive test coverage. Implement caching strategies, database optimization, and security middleware. Follow REST best practices and include proper documentation.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Create deployment configuration and developer resources. Generate API documentation, SDK examples in multiple languages, Postman collections, and integration guides. Set up CI/CD pipeline, monitoring dashboards, and provide troubleshooting guides for common integration issues.",
        connection: { type: "direct" },
      },
    ],
  },
];

const CREATIVE_PRESETS: PresetChain[] = [
  {
    id: "brand-marketing-strategy",
    title: "Marketing Strategy",
    description:
      "Complete brand positioning with content strategy and campaign planning",
    icon: PenTool,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "gpt-4o",
        prompt:
          "Develop comprehensive brand strategy for [COMPANY/PRODUCT]. Research target audience demographics, psychographics, and pain points. Define brand positioning, unique value proposition, brand personality, and competitive differentiation. Create detailed buyer personas and customer journey mapping.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Create integrated marketing strategy and content framework. Develop messaging hierarchy, content pillars, channel strategy, and campaign concepts. Design content calendar with specific tactics for each platform, including SEO strategy, social media approach, and email marketing sequences.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4.5-preview",
        prompt:
          "Execute creative campaign development with measurable outcomes. Write compelling copy for ads, landing pages, and email campaigns. Create social media content, blog post outlines, and campaign assets. Include A/B testing strategies, success metrics, and optimization recommendations.",
        connection: { type: "direct" },
      },
    ],
  },
  {
    id: "technical-content-creation",
    title: "Technical Content ",
    description:
      "Research-backed technical writing for documentation and thought leadership",
    icon: BookOpen,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "grok-3",
        prompt:
          "Research current trends and developments in [TECHNICAL DOMAIN]. Gather latest industry insights, expert opinions, case studies, and emerging technologies. Identify knowledge gaps and opportunities for unique perspectives in the technical content landscape.",
        connection: undefined,
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Structure and write comprehensive technical content. Create detailed outlines, write clear explanations of complex concepts, include practical examples and code snippets where relevant. Ensure accuracy, logical flow, and appropriate technical depth for the target audience.",
        connection: { type: "direct" },
      },
      {
        model: "gpt-4o-mini",
        prompt:
          "Optimize content for distribution and engagement. Edit for clarity and readability, create compelling headlines and social media snippets, suggest visual elements and diagrams, and develop promotion strategy across relevant channels and communities.",
        connection: {
          type: "conditional",
          condition: "length > 500 and contains('technical')",
        },
      },
    ],
  },
  {
    id: "presentation-pitch-deck",
    title: "Pitch Deck",
    description:
      "Research-driven presentations with compelling narrative and visual design",
    icon: Video,
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-amber-500/10",
    agents: [
      {
        model: "grok-3",
        prompt:
          "Research and gather supporting data for [PRESENTATION TOPIC]. Collect relevant statistics, market data, case studies, expert quotes, and compelling examples. Analyze audience background and expectations to tailor content appropriately.",
        connection: undefined,
      },
      {
        model: "gpt-4.5-preview",
        prompt:
          "Develop compelling narrative structure and key messages. Create logical flow from problem to solution, build persuasive arguments with supporting evidence, craft memorable opening and closing, and design clear call-to-action. Structure content for maximum impact and audience engagement.",
        connection: { type: "direct" },
      },
      {
        model: "claude-sonnet-4-20250514",
        prompt:
          "Create detailed slide-by-slide content with design specifications. Write concise, impactful text for each slide, suggest visual elements and layouts, include speaker notes and transition cues. Provide alternative versions for different time constraints and audiences.",
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
    title: "Content",
    icon: Lightbulb,
    iconColor: "text-yellow-400",
    presets: CREATIVE_PRESETS,
  },
];

export function WelcomeScreen({ onLoadPreset }: WelcomeScreenProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPresetInfo, setShowPresetInfo] = useState<string | null>(null);

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

  const handleCategoryClick = (categoryTitle: string) => {
    setSelectedCategory(categoryTitle);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleShowPresetInfo = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPresetInfo(presetId);
  };

  const handleClosePresetInfo = () => {
    setShowPresetInfo(null);
  };

  const selectedTheme = COLUMN_THEMES.find(
    (theme) => theme.title === selectedCategory
  );
  const infoPreset = showPresetInfo
    ? COLUMN_THEMES.flatMap((theme) => theme.presets).find(
        (preset) => preset.id === showPresetInfo
      )
    : null;

  return (
    <div className="h-min flex flex-col">
      {/* Main content area */}
      <div className="relative flex-1 flex items-start justify-center px-4 lg:px-8 ">
        <div className="fixed top-0 pb-24 lg:pb-0 w-full h-full flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto text-center space-y-4 md:space-y-8 welcome-screen-container md:w-auto md:margin-0 md:padding-0">
            {/* Welcome Message */}
            <div className="space-y-2 md:space-y-4">
              <div
                className="flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700 ease-out"
                style={{ animationDelay: "0.1s", animationFillMode: "both" }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight whitespace-nowrap welcome-screen-title">
                  What would you like to chain?
                </h1>
              </div>

              {/* <p
              className="text-xs md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-top-4 duration-700 ease-out"
              style={{ animationDelay: "0.3s", animationFillMode: "both" }}
            >
              {selectedCategory
                ? `${selectedCategory} workflow templates`
                : "Choose a preset workflow or create your own"}
            </p> */}
            </div>

            {/* Category Selection Buttons - Show immediately if no category selected */}
            {!selectedCategory && (
              <div className="mt-6 md:mt-8">
                <div className="grid grid-cols-3 md:flex md:flex-row md:items-center md:justify-center gap-2 md:gap-4 px-2 md:px-0">
                  {COLUMN_THEMES.map((theme, index) => (
                    <button
                      key={theme.title}
                      onClick={() => handleCategoryClick(theme.title)}
                      className={clsx(
                        "flex items-center justify-center gap-1 md:gap-3",
                        "px-2 sm:px-3 md:px-6 py-2.5 md:py-3",
                        "bg-gray-900/50 border border-gray-600/50 rounded-xl",
                        "text-gray-300 hover:text-lavender-400",
                        "hover:bg-gray-700/70 hover:border-lavender-400/50",
                        "backdrop-blur-sm transition-all duration-200 hover:scale-105",
                        "group animate-in fade-in slide-in-from-bottom-4 ease-out min-w-0"
                      )}
                      style={{
                        animationDelay: `${0.5 + index * 0.1}s`,
                        animationDuration: "0.6s",
                        animationFillMode: "both",
                      }}
                    >
                      <theme.icon
                        size={16}
                        className={`${theme.iconColor} group-hover:scale-110 transition-transform duration-200 flex-shrink-0 md:w-4 md:h-4`}
                      />
                      <span className="font-medium text-xs md:text-sm text-center leading-tight">
                        {theme.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Selection View (only show when category is selected) */}
            {selectedCategory && (
              <div className="space-y-4 md:space-y-6">
                {/* Back Button and Category Header */}
                <div
                  className="flex flex-row items-center justify-center gap-3 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ease-out"
                  style={{ animationDelay: "0.1s", animationFillMode: "both" }}
                >
                  <button
                    onClick={handleBackToCategories}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-900/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 rounded-3xl text-lavender-400 hover:text-white transition-all duration-200 group"
                  >
                    <ArrowLeft
                      size={14}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />
                    <span className="text-xs md:text-sm">Back</span>
                  </button>

                  {selectedTheme && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <selectedTheme.icon
                        size={18}
                        className={selectedTheme.iconColor}
                      />
                      <h2 className="text-lg md:text-2xl font-bold text-lavender-400">
                        {selectedTheme.title}
                      </h2>
                    </div>
                  )}
                </div>

                {/* Presets Grid */}
                {selectedTheme && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto">
                    {selectedTheme.presets.map((preset, presetIndex) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetClick(preset)}
                        disabled={selectedPreset !== null}
                        className={`group relative p-3 md:p-6 rounded-xl border-2 disabled:opacity-50 disabled:cursor-not-allowed w-full text-left transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 ease-out ${
                          selectedPreset === preset.id
                            ? "border-lavender-400 bg-lavender-500/10 scale-105"
                            : "border-gray-700/50 hover:border-lavender-400/50 bg-gradient-to-br " +
                              preset.bgGradient
                        }`}
                        style={{
                          animationDelay: `${0.2 + presetIndex * 0.1}s`,
                          animationDuration: "0.6s",
                          animationFillMode: "both",
                        }}
                      >
                        {/* Background Glow Effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-lavender-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Info Button */}
                        <div
                          onClick={(e) => handleShowPresetInfo(preset.id, e)}
                          className="absolute top-2 right-2 p-1 bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg text-gray-400 hover:text-lavender-400 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer"
                        >
                          <Eye size={12} className="md:w-3.5 md:h-3.5" />
                        </div>

                        {/* Content */}
                        <div className="relative space-y-2 md:space-y-4">
                          {/* Icon and Title */}
                          <div className="flex items-start gap-2 md:gap-3">
                            <div className="flex-shrink-0">
                              <div className="inline-flex p-1.5 md:p-2.5 rounded-lg bg-gray-800/50 border border-gray-600/50 group-hover:border-gray-500/50 transition-all duration-300 group-hover:scale-110">
                                <preset.icon
                                  size={16}
                                  className={`md:w-4.5 md:h-4.5 ${preset.iconColor} group-hover:scale-110 transition-transform duration-300`}
                                />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 md:mb-2">
                                <h3 className="text-sm md:text-lg font-semibold text-white group-hover:text-lavender-400 transition-colors duration-300 truncate">
                                  {preset.title}
                                </h3>
                              </div>
                              <p className="text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2 md:line-clamp-3">
                                {preset.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Loading State */}
                        {selectedPreset === preset.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-lavender-400">
                              <Zap size={14} className="animate-pulse" />
                              <span className="text-xs md:text-sm font-medium">
                                Loading...
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preset Info Modal */}
        {showPresetInfo &&
          infoPreset &&
          typeof window !== "undefined" &&
          createPortal(
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 animate-in fade-in duration-200">
              <div className="bg-gray-900/95 border border-gray-700/50 rounded-2xl w-full h-full md:max-w-2xl md:w-full md:max-h-[90vh] md:h-auto overflow-y-auto backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
                {/* Header */}
                <div className="flex items-center justify-between p-3 md:p-6 border-b border-gray-700/50">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="inline-flex p-1.5 md:p-2.5 rounded-lg bg-gray-800/50 border border-gray-600/50">
                      <infoPreset.icon
                        size={16}
                        className={`md:w-4.5 md:h-4.5 ${infoPreset.iconColor}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-base md:text-xl font-bold text-white">
                        {infoPreset.title}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-400">
                        {infoPreset.agents.length} Node Workflow
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePresetInfo}
                    className="p-1.5 md:p-2 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                  >
                    <X size={16} className="md:w-4.5 md:h-4.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 md:p-6 space-y-3 md:space-y-6">
                  {/* Description */}
                  <div
                    className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                    style={{
                      animationDelay: "0.1s",
                      animationFillMode: "both",
                    }}
                  >
                    <h4 className="text-xs md:text-sm font-semibold text-lavender-400 mb-1.5 md:mb-2">
                      Overview
                    </h4>
                    <p className="text-xs md:text-base text-gray-300 leading-relaxed">
                      {infoPreset.description}
                    </p>
                  </div>

                  {/* Agents */}
                  <div
                    className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                    style={{
                      animationDelay: "0.2s",
                      animationFillMode: "both",
                    }}
                  >
                    <h4 className="text-xs md:text-sm font-semibold text-lavender-400 mb-2 md:mb-3">
                      Workflow Nodes
                    </h4>
                    <div className="space-y-2 md:space-y-3">
                      {infoPreset.agents.map((agent, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2.5 md:p-4 animate-in fade-in slide-in-from-left-4 duration-400 ease-out"
                          style={{
                            animationDelay: `${0.3 + index * 0.05}s`,
                            animationFillMode: "both",
                          }}
                        >
                          <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                            <div className="w-4 h-4 md:w-6 md:h-6 bg-lavender-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                              <span className="text-xs md:text-sm font-medium text-white">
                                {agent.model}
                              </span>
                              {agent.connection && (
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-gray-300 w-fit">
                                  {agent.connection.type === "direct"
                                    ? "Direct"
                                    : "Conditional"}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                            {agent.prompt}
                          </p>
                          {agent.connection?.condition && (
                            <div className="mt-1.5 md:mt-2 p-1.5 md:p-2 bg-gray-700/30 border border-gray-600/30 rounded text-xs text-gray-400">
                              <span className="font-medium">Condition:</span>{" "}
                              {agent.connection.condition}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div
                    className="flex justify-end pt-3 md:pt-4 border-t border-gray-700/50 animate-in fade-in slide-in-from-bottom-2 duration-400 ease-out"
                    style={{
                      animationDelay: "0.4s",
                      animationFillMode: "both",
                    }}
                  >
                    <button
                      onClick={() => {
                        handleClosePresetInfo();
                        handlePresetClick(infoPreset);
                      }}
                      className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-lavender-500/25 hover:scale-105"
                    >
                      <Zap size={12} className="md:w-3.5 md:h-3.5" />
                      Start Workflow
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
