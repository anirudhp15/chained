"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Plus,
  ChevronDown,
  Trash2,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { Agent } from "../input/agent-input";

interface NodePillProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  index: number;
  canAddAgent?: boolean;
  onAddAgent?: () => void;
  isLastAgent?: boolean;
  onRemove?: () => void;
  canRemove?: boolean;
  // Mobile-specific props
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
  onLongPressStart?: (e: React.TouchEvent) => void;
  onLongPressEnd?: () => void;
  onTouchStart?: () => void;
  // Indicates if this agent can be collapsed (false for last agent)
  isCollapsible?: boolean;
}

// Enhanced model-specific example prompts with categories
const MODEL_PROMPTS = {
  // Claude models - Programming focused
  claude: {
    categories: [
      {
        name: "Web Development",
        prompts: [
          "Build a React component with TypeScript",
          "Create a responsive navigation bar with Tailwind CSS",
          "Implement user authentication with Next.js",
          "Build a REST API with Express.js and validation",
          "Create a real-time chat application with WebSockets",
        ],
      },
      {
        name: "Backend Development",
        prompts: [
          "Design a scalable database schema",
          "Create microservices architecture",
          "Implement caching strategies with Redis",
          "Build GraphQL API with resolvers",
          "Set up CI/CD pipeline with GitHub Actions",
        ],
      },
      {
        name: "Code Review & Debugging",
        prompts: [
          "Debug this Python function and optimize performance",
          "Review code for security vulnerabilities",
          "Refactor legacy JavaScript to modern ES6+",
          "Analyze and fix memory leaks in Node.js",
          "Optimize SQL queries for better performance",
        ],
      },
    ],
  },

  // GPT models - Analysis focused
  gpt: {
    categories: [
      {
        name: "Business Analysis",
        prompts: [
          "Analyze market trends and competitor landscape",
          "Create comprehensive business strategy report",
          "Evaluate investment opportunities and risks",
          "Develop go-to-market strategy for new product",
          "Assess operational efficiency and improvements",
        ],
      },
      {
        name: "Data & Research",
        prompts: [
          "Summarize research findings from multiple sources",
          "Analyze customer feedback and sentiment",
          "Create data visualization recommendations",
          "Evaluate survey results and statistical significance",
          "Compare pros and cons of different solutions",
        ],
      },
      {
        name: "Content & Communication",
        prompts: [
          "Write professional email templates",
          "Create engaging social media content strategy",
          "Develop presentation slides for stakeholders",
          "Draft technical documentation and user guides",
          "Generate creative marketing copy and headlines",
        ],
      },
    ],
  },

  // Grok models - Real-time data focused
  grok: {
    categories: [
      {
        name: "Market Intelligence",
        prompts: [
          "Get latest stock market data and analysis",
          "Research current cryptocurrency trends",
          "Find real-time commodity prices and forecasts",
          "Analyze breaking financial news impact",
          "Track industry merger and acquisition activity",
        ],
      },
      {
        name: "News & Events",
        prompts: [
          "Find current news on specific topic or company",
          "Research recent developments in technology",
          "Get updates on regulatory changes and compliance",
          "Track political events and policy changes",
          "Monitor social media trends and viral content",
        ],
      },
      {
        name: "Real-time Data",
        prompts: [
          "Check current weather and climate data",
          "Get live sports scores and statistics",
          "Find real-time traffic and transportation updates",
          "Monitor website performance and uptime",
          "Track social media engagement metrics",
        ],
      },
    ],
  },

  // O-series models - Reasoning focused
  reasoning: {
    categories: [
      {
        name: "Mathematical Problem Solving",
        prompts: [
          "Solve complex calculus optimization problems",
          "Work through advanced statistical analysis",
          "Explain mathematical proofs step-by-step",
          "Solve differential equations with boundary conditions",
          "Calculate probability distributions and expected values",
        ],
      },
      {
        name: "Logical Reasoning",
        prompts: [
          "Think through logical puzzles and brain teasers",
          "Analyze philosophical arguments and fallacies",
          "Break down decision-making processes",
          "Evaluate cause and effect relationships",
          "Solve constraint satisfaction problems",
        ],
      },
      {
        name: "Strategic Planning",
        prompts: [
          "Plan step-by-step approach to complex projects",
          "Analyze risk scenarios and mitigation strategies",
          "Design systematic problem-solving frameworks",
          "Create decision trees for complex choices",
          "Develop contingency plans for various outcomes",
        ],
      },
    ],
  },
};

function getModelCategory(model: string): keyof typeof MODEL_PROMPTS {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("claude")) return "claude";
  if (modelLower.includes("grok")) return "grok";
  if (
    modelLower.includes("o1") ||
    modelLower.includes("o3") ||
    modelLower.includes("o4")
  )
    return "reasoning";
  return "gpt"; // Default for GPT and other models
}

// Hook to detect if we're on mobile (below lg breakpoint)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    // Check on mount
    checkIsMobile();

    // Add resize listener
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

export function NodePill({
  agent,
  onUpdate,
  index,
  canAddAgent,
  onAddAgent,
  isLastAgent,
  onRemove,
  canRemove,
  isExpanded,
  onToggleExpansion,
  onLongPressStart,
  onLongPressEnd,
  onTouchStart,
  isCollapsible,
}: NodePillProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(agent.name || `Node ${index + 1}`);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const nodeName = agent.name || `Node ${index + 1}`;
  const modelCategory = getModelCategory(agent.model);
  const promptData = MODEL_PROMPTS[modelCategory];

  const handleNameSave = () => {
    setIsEditing(false);
    if (tempName.trim()) {
      onUpdate({ ...agent, name: tempName.trim() });
    } else {
      setTempName(nodeName);
    }
  };

  const handlePromptInsert = (prompt: string) => {
    onUpdate({ ...agent, prompt });
    setShowPromptsModal(false);
    setSearchTerm("");
    setSelectedCategory(null);
  };

  const filteredPrompts = React.useMemo(() => {
    if (!promptData) return [];

    let categories = promptData.categories;

    // Filter by category if selected
    if (selectedCategory) {
      categories = categories.filter((cat) => cat.name === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      categories = categories
        .map((category) => ({
          ...category,
          prompts: category.prompts.filter((prompt) =>
            prompt.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((category) => category.prompts.length > 0);
    }

    return categories;
  }, [promptData, selectedCategory, searchTerm]);

  const getModelDisplayName = () => {
    switch (modelCategory) {
      case "claude":
        return "Programming";
      case "grok":
        return "Real-time Data";
      case "reasoning":
        return "Reasoning";
      default:
        return "Analysis";
    }
  };

  return (
    <>
      {/* Compact Pill */}
      <div
        ref={pillRef}
        className={`relative ${!isLastAgent || isExpanded ? "mb-2" : "mb-0"} px-2 lg:px-0`}
      >
        {/* Base Pill */}
        <div
          className={`bg-gray-900/75 backdrop-blur-sm mx-auto border border-gray-600/50 rounded-3xl px-4 py-2 transition-all duration-200 hover:bg-gray-800/90 hover:border-lavender-400/20 w-full max-w-4xl group shadow-lg shadow-gray-950/50 animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-bottom-8 ease-out ${isExpanded ? "bg-gray-800/90 border-lavender-400/30" : ""} ${
            // Add visual indication for non-collapsible (last) agents on mobile
            isMobile && !isCollapsible
              ? "border-green-400/20 bg-green-900/10"
              : ""
          }`}
          onClick={
            // Only enable click-to-expand on mobile (below lg breakpoint) and if collapsible
            isMobile && isCollapsible ? onToggleExpansion : undefined
          }
          onTouchStart={
            isMobile && isCollapsible
              ? (e) => {
                  onTouchStart?.();
                  onLongPressStart?.(e);
                }
              : undefined
          }
          onTouchEnd={isMobile && isCollapsible ? onLongPressEnd : undefined}
          onTouchCancel={isMobile && isCollapsible ? onLongPressEnd : undefined}
        >
          <div className="flex items-center justify-between">
            {/* Left: Node Name */}
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <div className="w-2 h-2 bg-lavender-400/50 rounded-full"></div>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") {
                        setIsEditing(false);
                        setTempName(nodeName);
                      }
                    }}
                    className="bg-gray-700/50 whitespace-nowrap border border-gray-500/50 rounded px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-lavender-400/50"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-lavender-400 rounded-full"></div>
                  <span className="text-xs whitespace-nowrap text-lavender-400 font-medium">
                    {nodeName}
                  </span>
                </>
              )}

              {/* Desktop: Pencil icon on hover, Mobile: Always visible */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="lg:opacity-0 lg:group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 hover:bg-gray-700/50 rounded"
                >
                  <Pencil
                    size={12}
                    className="text-gray-400 hover:text-lavender-400"
                  />
                </button>
              )}

              {/* Prompts Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPromptsModal(true);
                }}
                className="lg:opacity-0 lg:group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 whitespace-nowrap hover:bg-gray-700/50 rounded flex items-center gap-1"
                title="Example prompts"
              >
                <Sparkles
                  size={12}
                  className="text-gray-400 hover:text-lavender-400"
                />
                <span className="text-xs whitespace-nowrap text-gray-400 hover:text-lavender-400 hidden xl:inline">
                  Ideas
                </span>
              </button>
            </div>

            {/* Right: Status + Controls */}
            <div className="flex items-center gap-3">
              {/* Mobile: Prompt Preview + Status Icon */}
              <div className="lg:hidden flex items-center gap-2">
                {agent.prompt?.trim() ? (
                  <span className="text-xs text-gray-300 truncate w-24 sm:w-48">
                    {agent.prompt.length > 32
                      ? `${agent.prompt.substring(0, 32)}...`
                      : agent.prompt}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">No prompt</span>
                )}
                <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    width="8"
                    height="6"
                    viewBox="0 0 8 6"
                    fill="none"
                    className="text-white"
                  >
                    <path
                      d="M7 1L3 5L1 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Desktop: Original Status */}
              <span className="text-xs text-gray-500 group-hover:text-lavender-400 whitespace-nowrap hidden lg:block">
                Ready
              </span>

              {/* Close Agent Button - only show if canRemove */}
              {canRemove && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 hover:bg-red-600/80 text-gray-400 hover:text-white rounded-md text-xs font-medium transition-colors"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              )}

              {/* Add Agent Button - only on last agent */}
              {isLastAgent && canAddAgent && onAddAgent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAgent();
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-lavender-500 hover:bg-lavender-600 text-white rounded-md text-xs font-medium transition-colors"
                >
                  <Plus size={12} />
                  <span className="hidden sm:inline">LLM</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Prompts Modal */}
      {showPromptsModal &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowPromptsModal(false);
                setSearchTerm("");
                setSelectedCategory(null);
              }}
            />
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
              <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-800/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-lavender-500/10 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-lavender-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Example Prompts
                        </h2>
                        <p className="text-sm text-gray-400">
                          {getModelDisplayName()} • {agent.model}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPromptsModal(false);
                        setSearchTerm("");
                        setSelectedCategory(null);
                      }}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search prompts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 text-sm"
                      />
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === null
                            ? "bg-lavender-500 text-white"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                        }`}
                      >
                        All Categories
                      </button>
                      {promptData?.categories.map((category) => (
                        <button
                          key={category.name}
                          onClick={() => setSelectedCategory(category.name)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === category.name
                              ? "bg-lavender-500 text-white"
                              : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {filteredPrompts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-400">
                        No prompts found matching your search.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {filteredPrompts.map((category, categoryIndex) => (
                        <div key={category.name} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-semibold text-white">
                              {category.name}
                            </h3>
                            <div className="flex-1 h-px bg-gray-700/50"></div>
                            <span className="text-xs text-gray-500">
                              {category.prompts.length} prompts
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {category.prompts.map((prompt, promptIndex) => (
                              <button
                                key={promptIndex}
                                onClick={() => handlePromptInsert(prompt)}
                                className="text-left p-4 bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/30 hover:border-lavender-400/30 rounded-xl transition-all duration-200 group"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm text-gray-300 group-hover:text-white line-clamp-2 leading-relaxed">
                                    {prompt}
                                  </p>
                                  <div className="flex-shrink-0 w-6 h-6 bg-lavender-500/10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-3 h-3 text-lavender-400" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
