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
  GitCommitHorizontal,
  GitFork,
  GitCompareArrows,
  Tally1,
  Tally2,
  Tally3,
  Tally4,
  CircleAlert,
  CircleCheck,
  Settings,
  Zap,
} from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";
import { Agent } from "../input/agent-input";
import {
  CONDITION_PRESETS,
  MODEL_PROVIDERS,
  getProviderKey,
  CONNECTION_TYPES,
  type EnabledConnectionType,
} from "@/lib/constants";
import { generateSmartAgentName } from "@/lib/utils";

// Chain Quick Settings Component for Root LLM
const ChainQuickSettings = ({
  onSetAllConnections,
  onClose,
}: {
  onSetAllConnections: (type: EnabledConnectionType) => void;
  onClose: () => void;
}) => {
  return (
    <div className="mb-2 bg-gray-800/90 backdrop-blur-sm border border-gray-600/50 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings size={16} className="text-lavender-400" />
          Chain Settings
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-700/50 rounded">
          <X size={14} className="text-gray-400 hover:text-white" />
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-300 mb-2 block">
          Set All Connections
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CONNECTION_TYPES.map((connectionType) => (
            <button
              key={connectionType.type}
              onClick={() =>
                onSetAllConnections(
                  connectionType.type as EnabledConnectionType
                )
              }
              className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors bg-gray-700/30 hover:bg-gray-600/50 hover:${connectionType.bgColor} hover:${connectionType.borderColor} border border-gray-700/30`}
            >
              <connectionType.Icon
                size={16}
                className={`${connectionType.color} ${connectionType.iconRotate || ""}`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {connectionType.label}
                </div>
                <div className="text-xs text-gray-400">
                  All {connectionType.label.toLowerCase()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  // Connection configuration for all screen sizes
  showConnection?: boolean;
  sourceAgentName?: string;
  // All agents in the chain for smart naming
  allAgents?: Agent[];
  // New prop for chain quick settings
  onSetAllConnections?: (type: EnabledConnectionType) => void;
  // Collaborative grouping props
  collaborativeAgents?: Agent[];
  isCollaborativeGroup?: boolean;
  collaborativeGroupSize?: number;
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

// Get simplified model name for display
function getSimplifiedModelName(model: string): string {
  const modelLower = model.toLowerCase();

  // OpenAI models
  if (
    modelLower.includes("gpt") ||
    modelLower.includes("o1") ||
    modelLower.includes("o3") ||
    modelLower.includes("o4")
  ) {
    if (modelLower.includes("o1")) return "o1";
    if (modelLower.includes("o3")) return "o3";
    if (modelLower.includes("o4")) return "o4";
    if (modelLower.includes("4o")) return "4o";
    if (modelLower.includes("4.1")) return "4.1";
    if (modelLower.includes("4-turbo")) return "4 Turbo";
    if (modelLower.includes("gpt-4")) return "4";
    if (modelLower.includes("3.5")) return "3.5";
    return "GPT";
  }

  // Claude models
  if (modelLower.includes("claude")) {
    if (modelLower.includes("3-7")) return "Sonnet 3.7";
    if (modelLower.includes("3-5")) return "Sonnet 3.5";
    if (modelLower.includes("3-opus")) return "Opus 3";
    if (modelLower.includes("3-sonnet")) return "Sonnet 3";
    if (modelLower.includes("3-haiku")) return "Haiku 3";
    if (modelLower.includes("sonnet")) return "Sonnet";
    if (modelLower.includes("opus")) return "Opus";
    if (modelLower.includes("haiku")) return "Haiku";
    return "Claude";
  }

  // Grok models
  if (modelLower.includes("grok")) {
    const match = modelLower.match(/grok-?(\d+)/);
    if (match) return match[1];
    return "Grok";
  }

  // Other models - try to extract version number
  const versionMatch = model.match(/\d+(?:\.\d+)?/);
  return versionMatch ? versionMatch[0] : model;
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
  showConnection = false,
  sourceAgentName,
  allAgents = [],
  onSetAllConnections,
  collaborativeAgents,
  isCollaborativeGroup,
  collaborativeGroupSize,
}: NodePillProps) {
  // Generate smart default name based on model and existing agents
  const getDefaultName = () => {
    if (agent.name) return agent.name;
    const effectiveModel = agent.model || "gpt-4o";
    return generateSmartAgentName(effectiveModel, allAgents, agent.id);
  };

  // Get provider info for display
  const getProviderDisplay = () => {
    const effectiveModel = agent.model || "gpt-4o";
    const providerKey = getProviderKey(effectiveModel);
    const provider = MODEL_PROVIDERS[providerKey];
    const simplifiedName = getSimplifiedModelName(effectiveModel);

    return {
      icon: provider?.icon,
      iconColor: provider?.iconColor,
      name: simplifiedName,
      fallbackName: getDefaultName(),
    };
  };

  // Get tally logic for duplicate detection
  const getTallyInfo = () => {
    const tallyMap = new Map<string, number>();
    const displayNames: string[] = [];

    // Build display names for all agents
    allAgents.forEach((ag) => {
      const effectiveModel = ag.model || "gpt-4o";
      const simplifiedName = getSimplifiedModelName(effectiveModel);
      const displayName = ag.name || simplifiedName;
      displayNames.push(displayName);
    });

    // Count occurrences and assign tally numbers
    const nameCounts: { [key: string]: number } = {};
    const nameIndexes: { [key: string]: number[] } = {};

    displayNames.forEach((name, idx) => {
      if (!nameCounts[name]) {
        nameCounts[name] = 0;
        nameIndexes[name] = [];
      }
      nameCounts[name]++;
      nameIndexes[name].push(idx);
    });

    // Only assign tallies if there are duplicates
    Object.keys(nameCounts).forEach((name) => {
      if (nameCounts[name] > 1) {
        nameIndexes[name].forEach((agentIndex, occurrence) => {
          tallyMap.set(`${agentIndex}`, occurrence + 1); // 1-based tally numbers
        });
      }
    });

    return tallyMap;
  };

  const getTallyIcon = (tallyNumber: number) => {
    switch (tallyNumber) {
      case 1:
        return Tally1;
      case 2:
        return Tally2;
      case 3:
        return Tally3;
      case 4:
        return Tally4;
      default:
        return null;
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(getDefaultName());
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showChainSettings, setShowChainSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const nodeName = getDefaultName();
  const modelCategory = getModelCategory(agent.model);
  const promptData = MODEL_PROMPTS[modelCategory];
  const providerDisplay = getProviderDisplay();
  const tallyMap = getTallyInfo();
  const currentTallyNumber = tallyMap.get(`${index}`);
  const TallyIcon = currentTallyNumber
    ? getTallyIcon(currentTallyNumber)
    : null;

  // Update tempName when agent name, model, or allAgents change
  useEffect(() => {
    setTempName(getDefaultName());
  }, [agent.name, agent.model, allAgents]);

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

  // Chain settings handler
  const handleSetAllConnections = (type: EnabledConnectionType) => {
    if (onSetAllConnections) {
      onSetAllConnections(type);
    }
    setShowChainSettings(false);
  };

  // Collaborative group display logic
  const renderCollaborativeGroup = () => {
    if (!isCollaborativeGroup || !collaborativeAgents) {
      return null;
    }

    return (
      <div className="flex items-center gap-1">
        {collaborativeAgents.map((collabAgent, idx) => {
          const collabProviderDisplay = getProviderDisplayForAgent(collabAgent);
          const collabTallyNumber = tallyMap.get(`${index + idx}`);
          const CollabTallyIcon = collabTallyNumber
            ? getTallyIcon(collabTallyNumber)
            : null;

          return (
            <React.Fragment key={collabAgent.id}>
              {/* Edit button for this collaborative agent */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="transition-all duration-75 p-1 hover:bg-gray-700/50 rounded"
              >
                <Pencil
                  size={12}
                  className="text-gray-400 hover:text-lavender-400"
                />
              </button>

              {/* Agent display */}
              <div className="flex items-center gap-1">
                {collabProviderDisplay.icon && (
                  <collabProviderDisplay.icon
                    size={14}
                    className={collabProviderDisplay.iconColor}
                  />
                )}
                <span className="text-xs whitespace-nowrap text-white font-medium">
                  {collabAgent.name ||
                    generateSmartAgentName(
                      collabAgent.model || "gpt-4o",
                      allAgents,
                      collabAgent.id
                    )}
                </span>
                {CollabTallyIcon && (
                  <CollabTallyIcon size={14} className="text-white" />
                )}
              </div>

              {/* Collaborative connection icon between agents */}
              {idx < collaborativeAgents.length - 1 && (
                <div title="Collaborative connection" className="mx-1">
                  <GitCompareArrows size={12} className="text-green-400" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Helper function to get provider display for any agent
  const getProviderDisplayForAgent = (ag: Agent) => {
    const effectiveModel = ag.model || "gpt-4o";
    const providerKey = getProviderKey(effectiveModel);
    const provider = MODEL_PROVIDERS[providerKey];
    const simplifiedName = getSimplifiedModelName(effectiveModel);

    return {
      icon: provider?.icon,
      iconColor: provider?.iconColor,
      name: simplifiedName,
    };
  };

  // Connection handling functions
  const currentConnectionType = agent.connection?.type || "direct";
  const currentConnection = CONNECTION_TYPES.find(
    (c) => c.type === currentConnectionType
  );

  const handleConnectionTypeChange = (type: EnabledConnectionType) => {
    const baseConnection = {
      type,
      sourceAgentId: agent.connection?.sourceAgentId,
    };
    const newConnection =
      type === "conditional"
        ? { ...baseConnection, condition: agent.connection?.condition || "" }
        : baseConnection;

    onUpdate({ ...agent, connection: newConnection });
    setShowConnectionModal(false);
  };

  const handleConditionChange = (condition: string) => {
    onUpdate({
      ...agent,
      connection: { ...agent.connection, type: "conditional", condition },
    });
  };

  // Get display text for connection button
  const getConnectionDisplayText = () => {
    if (currentConnectionType === "parallel") {
      return "Parallel";
    }
    return sourceAgentName || `Node ${index}`;
  };

  // Get provider display for source agent (for connection display)
  const getSourceProviderDisplay = () => {
    if (currentConnectionType === "parallel") {
      return { text: "Parallel", icon: null, iconColor: "", tallyIcon: null };
    }

    // Find the source agent to get its model info
    const sourceAgent = allAgents.find((_, idx) => idx === index - 1);
    if (!sourceAgent) {
      return {
        text: sourceAgentName || `Node ${index}`,
        icon: null,
        iconColor: "",
        tallyIcon: null,
      };
    }

    const effectiveModel = sourceAgent.model || "gpt-4o";
    const providerKey = getProviderKey(effectiveModel);
    const provider = MODEL_PROVIDERS[providerKey];
    const simplifiedName = getSimplifiedModelName(effectiveModel);

    // Get tally for source agent (index - 1)
    const sourceTallyNumber = tallyMap.get(`${index - 1}`);
    const SourceTallyIcon = sourceTallyNumber
      ? getTallyIcon(sourceTallyNumber)
      : null;

    return {
      text: sourceAgent.name || simplifiedName,
      icon: provider?.icon,
      iconColor: provider?.iconColor,
      tallyIcon: SourceTallyIcon,
    };
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
      {/* Chain Settings Panel - only for root LLM (index 0) on desktop */}
      {!isMobile && index === 0 && showChainSettings && onSetAllConnections && (
        <ChainQuickSettings
          onSetAllConnections={handleSetAllConnections}
          onClose={() => setShowChainSettings(false)}
        />
      )}

      {/* Compact Pill */}
      <div
        ref={pillRef}
        className={`relative ${!isLastAgent || isExpanded ? "mb-2" : "mb-0"} px-2 lg:px-0`}
      >
        {/* Base Pill with width adjustment for collaborative groups */}
        <div
          className={`bg-gray-900/75 backdrop-blur-sm mx-auto lg:border border-gray-600/50 rounded-xl px-2 lg:px-4 py-2 transition-all duration-200 hover:bg-gray-800/90 hover:border-lavender-400/20 group shadow-lg shadow-gray-950/50 animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-bottom-8 ease-out ${isExpanded ? "bg-gray-800/90 border-lavender-400/30" : ""} ${
            // Add visual indication for non-collapsible (last) agents on mobile
            isMobile && !isCollapsible
              ? "border-green-400/20 bg-slate-800/90"
              : ""
          } ${
            // Width adjustment for collaborative groups - use more conservative sizing
            isCollaborativeGroup && collaborativeGroupSize
              ? collaborativeGroupSize === 2
                ? "w-full lg:w-[calc(150%+0.25rem)]"
                : collaborativeGroupSize === 3
                  ? "w-full lg:w-[calc(200%+0.5rem)]"
                  : "w-full lg:w-[calc(250%+0.75rem)]"
              : "w-full"
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
            {/* Left: Node Name(s) */}
            <div className="flex items-center gap-1">
              {/* Root LLM Settings Button - only on desktop */}
              {!isMobile &&
                index === 0 &&
                !isEditing &&
                onSetAllConnections && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChainSettings(!showChainSettings);
                    }}
                    className="transition-all duration-75 p-1 hover:bg-gray-700/50 rounded"
                    title="Chain settings"
                  >
                    <Settings
                      size={12}
                      className="text-gray-400 hover:text-lavender-400"
                    />
                  </button>
                )}

              {/* Collaborative Group Display */}
              {isCollaborativeGroup ? (
                renderCollaborativeGroup()
              ) : (
                <>
                  {/* Single Agent Display */}
                  {/* Desktop: Pencil icon on hover, Mobile: Always visible */}
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="transition-all duration-75 p-1 hover:bg-gray-700/50 rounded"
                    >
                      <Pencil
                        size={12}
                        className="text-gray-400 hover:text-lavender-400"
                      />
                    </button>
                  )}
                  {isEditing ? (
                    <>
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
                      {/* Provider Icon + Simplified Name + Tally */}
                      <div className="flex items-center gap-1">
                        {providerDisplay.icon && (
                          <providerDisplay.icon
                            size={14}
                            className={providerDisplay.iconColor}
                          />
                        )}
                        <span className="text-xs whitespace-nowrap text-white font-medium">
                          {agent.name ? nodeName : providerDisplay.name}
                        </span>
                        {TallyIcon && (
                          <TallyIcon size={14} className="text-white" />
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Mobile Connection Button - only show on mobile and if showConnection is true */}
              {isMobile &&
                showConnection &&
                !isEditing &&
                !isCollaborativeGroup &&
                (() => {
                  const sourceDisplay = getSourceProviderDisplay();
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConnectionModal(true);
                      }}
                      className={`p-1 flex items-center gap-2 hover:bg-gray-700/50 rounded hover:${currentConnection?.bgColor} hover:${currentConnection?.borderColor}`}
                      title={`Connection: ${currentConnectionType === "parallel" ? "Parallel" : currentConnection?.label + "ly from " + sourceAgentName}`}
                    >
                      {currentConnection && (
                        <currentConnection.Icon
                          size={12}
                          className={`${currentConnection.color} ${currentConnection.iconRotate || ""}`}
                        />
                      )}
                      <div className="flex items-center gap-1">
                        {sourceDisplay.icon && (
                          <sourceDisplay.icon
                            size={10}
                            className={sourceDisplay.iconColor}
                          />
                        )}
                        <span
                          className={`text-xs font-medium ${currentConnection?.color}`}
                        >
                          {sourceDisplay.text}
                        </span>
                        {sourceDisplay.tallyIcon && (
                          <sourceDisplay.tallyIcon
                            size={10}
                            className="text-lavender-400"
                          />
                        )}
                      </div>
                      {currentConnectionType === "conditional" && (
                        // show truncated connection condition
                        <span className="text-xs text-gray-400">
                          {agent.connection?.condition?.substring(0, 10)}
                        </span>
                      )}
                    </button>
                  );
                })()}

              {/* Desktop Connection Button - only show on desktop and if showConnection is true */}
              {!isMobile &&
                showConnection &&
                !isEditing &&
                !isCollaborativeGroup &&
                (() => {
                  const sourceDisplay = getSourceProviderDisplay();
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConnectionModal(true);
                      }}
                      className={`lg:opacity-50 lg:group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 flex items-center gap-3 hover:bg-gray-700/50 rounded hover:${currentConnection?.bgColor} hover:${currentConnection?.borderColor}`}
                      title={`Connection: ${currentConnectionType === "parallel" ? "Parallel" : currentConnection?.label + "ly from " + sourceAgentName}`}
                    >
                      {currentConnection && (
                        <currentConnection.Icon
                          size={14}
                          className={`${currentConnection.color} ${currentConnection.iconRotate || ""}`}
                        />
                      )}
                      <div className="flex items-center gap-1">
                        {sourceDisplay.icon && (
                          <sourceDisplay.icon
                            size={14}
                            className={sourceDisplay.iconColor}
                          />
                        )}
                        <span className={`text-xs font-medium text-white`}>
                          {sourceDisplay.text}
                        </span>
                        {sourceDisplay.tallyIcon && (
                          <sourceDisplay.tallyIcon
                            size={14}
                            className="text-white"
                          />
                        )}
                      </div>
                      {currentConnectionType === "conditional" && (
                        <span className="text-xs text-gray-400">
                          {agent.connection?.condition?.substring(0, 8)}...
                        </span>
                      )}
                    </button>
                  );
                })()}
            </div>

            {/* Right: Status + Controls */}
            <div className="flex items-center gap-1">
              {/* Mobile: Prompt Status Icon */}
              <div className="lg:hidden flex items-center gap-2">
                {agent.prompt?.trim() ? (
                  <div title="Prompt configured">
                    <CircleCheck size={14} className="text-green-400" />
                  </div>
                ) : (
                  <div title="No prompt configured">
                    <CircleAlert size={14} className="text-amber-400" />
                  </div>
                )}
              </div>

              {/* Prompts Button - moved to right side for mobile */}
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
                  Prompts
                </span>
              </button>

              {/* Close Agent Button - only show if canRemove */}
              {canRemove && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="p-1 hover:bg-red-600/80 text-gray-400 hover:text-white rounded text-xs font-medium transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}

              {/* Add Agent Button - only on last agent */}
              {isLastAgent && canAddAgent && onAddAgent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAgent();
                  }}
                  className="flex items-center gap-1 lg:px-2 p-1 lg:py-1 bg-lavender-500 hover:bg-lavender-600 text-white rounded lg:rounded-2xl text-xs font-medium transition-colors"
                >
                  <Plus size={12} />
                  <span className="hidden sm:inline">LLM</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Configuration Modal */}
      {showConnectionModal &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowConnectionModal(false)}
            />
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
              <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-lavender-500/10 rounded-xl flex items-center justify-center">
                        {currentConnection && (
                          <currentConnection.Icon
                            className={`w-4 h-4 ${currentConnection.color} ${currentConnection.iconRotate || ""}`}
                          />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Connection Type
                        </h2>
                        <p className="text-sm text-gray-400">{nodeName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowConnectionModal(false)}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  {CONNECTION_TYPES.map((connectionType) => {
                    const isSelected =
                      currentConnectionType === connectionType.type;

                    return (
                      <button
                        key={connectionType.type}
                        onClick={() =>
                          handleConnectionTypeChange(connectionType.type)
                        }
                        className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors ${
                          isSelected
                            ? `${connectionType.bgColor} ${connectionType.borderColor} border-2`
                            : "bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/30"
                        }`}
                      >
                        <connectionType.Icon
                          size={20}
                          className={`${connectionType.color} ${connectionType.iconRotate || ""}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${isSelected ? connectionType.color : "text-white"}`}
                          >
                            {connectionType.label}
                          </div>
                          <div className="text-xs mt-1 text-gray-400">
                            {connectionType.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Conditional Input */}
                  {currentConnectionType === "conditional" && (
                    <div className="mt-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                      <label className="block text-sm font-medium text-white mb-2">
                        Condition
                      </label>
                      <input
                        type="text"
                        value={agent.connection?.condition || ""}
                        onChange={(e) => handleConditionChange(e.target.value)}
                        placeholder="Enter condition..."
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 text-sm"
                      />
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-300 mb-2 block">
                          Quick presets:
                        </span>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {CONDITION_PRESETS.slice(0, 3).map((preset, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                handleConditionChange(preset.condition)
                              }
                              className="w-full px-3 py-2 text-left text-white hover:bg-gray-600/70 rounded-lg text-xs transition-colors"
                            >
                              <div className="font-medium text-lavender-400">
                                {preset.label}
                              </div>
                              <div className="text-gray-400 font-mono text-[10px] truncate">
                                {preset.placeholder}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

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
