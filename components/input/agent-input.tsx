"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronDown,
  Plus,
  Search,
  Eye,
  MessageSquare,
  Image,
  Mic,
  Code,
  Zap,
  Brain,
  Globe,
  Pencil,
  BarChart3,
  ArrowUp,
  LoaderCircle,
  ExternalLink,
  SquareArrowOutUpRight,
  Copy,
} from "lucide-react";
import { SiOpenai, SiClaude } from "react-icons/si";
import { UploadedImage } from "../modality/ImageUpload";
import { WebSearchData } from "../modality/WebSearch";
import { ModalityIcons } from "../modality/ModalityIcons";
import {
  CONDITION_PRESETS,
  MODEL_PROVIDERS,
  getProviderKey,
  type ModelProviders,
  type ModelConfig,
} from "@/lib/constants";
import { ToolButton } from "../ui/ToolButton";
import { usePerformance } from "@/lib/performance-context";
import { generateSmartAgentName } from "@/lib/utils";

export interface Agent {
  id: string;
  model: string;
  prompt: string;
  name?: string;
  connection?: {
    type: "direct" | "conditional" | "parallel" | "collaborative";
    condition?: string;
    sourceAgentId?: string;
  };
  images?: UploadedImage[];
  audioBlob?: Blob;
  audioDuration?: number;
  audioTranscription?: string;
  webSearchData?: WebSearchData;
  // New simplified toggles
  webSearchEnabled?: boolean;
  // Enhanced options for Grok
  grokOptions?: {
    realTimeData?: boolean;
    thinkingMode?: boolean;
  };
  // Enhanced options for Claude
  claudeOptions?: {
    enableTools?: boolean;
    toolSet?: "webSearch" | "fileAnalysis" | "computerUse" | "full";
    fileAttachments?: Array<{
      name: string;
      content: string;
      mimeType: string;
    }>;
  };
  // LLM parameters
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface AgentInputProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  index: number;
  isLastAgent?: boolean;
  onSendChain?: () => void;
  canSend?: boolean;
  isLoading?: boolean;
  // Mobile-specific prop
  isMobileCollapsed?: boolean;
  // All agents in the chain for smart naming
  allAgents?: Agent[];
  // Copy functionality
  onCopyPrompt?: () => void;
  showCopyButton?: boolean;
}

// Modality Icons Component
const ModalityIcon = ({
  type,
  className = "",
}: {
  type: string;
  className?: string;
}) => {
  const iconProps = { size: 12, className };

  const icons = {
    text: MessageSquare,
    vision: Eye,
    image: Image,
    audio: Mic,
    code: Code,
    fast: Zap,
    reasoning: Brain,
    web: Globe,
  };

  const IconComponent = icons[type as keyof typeof icons];
  return IconComponent ? <IconComponent {...iconProps} /> : null;
};

// Style constants
const STYLES = {
  card: "bg-gray-800/70 backdrop-blur-sm border border-gray-600/50",
  button:
    "bg-gray-800/90 border border-gray-600/50 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 transition-all text-xs backdrop-blur-sm",
  modal:
    "fixed bg-gray-800/98 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[9999999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto",
  backdrop: "fixed inset-0 z-[999999] bg-black/20",
  backdropBlur: "fixed inset-0 z-[999999] bg-black/30 pointer-events-auto",
  input:
    "bg-gray-800/90 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50",
  // New consolidated styles
  iconSize: "md:w-3.5 md:h-3.5",
  iconSizeSmall: "md:w-3 md:h-3",
  gap: "gap-1.5 md:gap-2",
  padding: "p-1.5 md:p-2",
  paddingSmall: "px-1.5 md:px-2 py-0.5 md:py-1",
  textResponsive: "text-xs md:text-sm",
  hoverButton: "transition-colors hover:bg-gray-700/50 rounded",
} as const;

export function AgentInput({
  agent,
  onUpdate,
  index,
  isLastAgent,
  onSendChain,
  canSend,
  isLoading,
  isMobileCollapsed,
  allAgents = [],
  onCopyPrompt,
  showCopyButton,
}: AgentInputProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isNameEditing, setIsNameEditing] = useState(false);
  // Generate smart default name based on model and existing agents
  const getDefaultName = () => {
    if (agent.name) return agent.name;
    const effectiveModel = agent.model || "gpt-4o";
    return generateSmartAgentName(effectiveModel, allAgents, agent.id);
  };

  const [tempName, setTempName] = useState(getDefaultName());
  const [buttonPositions, setButtonPositions] = useState<{
    model?: DOMRect | null;
    condition?: DOMRect | null;
  }>({});
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [autoCollapseTimeout, setAutoCollapseTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update tempName when agent name, model, or allAgents change
  useEffect(() => {
    setTempName(getDefaultName());
  }, [agent.name, agent.model, allAgents]);

  const nodeName = getDefaultName();

  const handleNameSave = () => {
    setIsNameEditing(false);
    if (tempName.trim()) {
      onUpdate({ ...agent, name: tempName.trim() });
    } else {
      setTempName(nodeName);
    }
  };

  const currentProvider = (() => {
    const providerKey = getProviderKey(agent.model);
    const provider = MODEL_PROVIDERS[providerKey];

    // If no provider found and agent.model is empty, default to OpenAI for gpt-4o
    if (!provider && (!agent.model || agent.model.trim() === "")) {
      return MODEL_PROVIDERS.openai;
    }

    return provider;
  })();

  const selectedModel = (() => {
    const providerKey = getProviderKey(agent.model);
    const foundModel = MODEL_PROVIDERS[providerKey]?.models.find(
      (m) => m.value === agent.model
    );

    // If no model is found and agent.model is empty, default to gpt-4o
    if (!foundModel && (!agent.model || agent.model.trim() === "")) {
      return MODEL_PROVIDERS.openai.models.find((m) => m.value === "gpt-4o");
    }

    return foundModel;
  })();

  // Get the effective model value for components that need a model value
  const effectiveModelValue = (() => {
    if (!agent.model || agent.model.trim() === "") {
      return "gpt-4o";
    }
    return agent.model;
  })();

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [agent.prompt]);

  useEffect(() => {
    const handleResize = () => adjustTextareaHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-dropdown]")) {
        setIsModelDropdownOpen(false);
        setShowConditionInput(false);
        setIsTextExpanded(false);
        setSearchQuery("");
        setFocusedModelIndex(-1);
        // Clear auto-collapse timer when clicking outside
        if (autoCollapseTimeout) {
          clearTimeout(autoCollapseTimeout);
          setAutoCollapseTimeout(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autoCollapseTimeout]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModelDropdownOpen) {
        setIsModelDropdownOpen(false);
        setIsTextExpanded(false);
        setSearchQuery("");
        setFocusedModelIndex(-1);
      }
    };

    if (isModelDropdownOpen) {
      document.addEventListener("keydown", handleEscKey);
      return () => document.removeEventListener("keydown", handleEscKey);
    }
  }, [isModelDropdownOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCollapseTimeout) {
        clearTimeout(autoCollapseTimeout);
      }
    };
  }, [autoCollapseTimeout]);

  // Debug modal state changes
  useEffect(() => {
    console.log(
      "Modal state changed - isModelDropdownOpen:",
      isModelDropdownOpen
    );
  }, [isModelDropdownOpen]);

  useEffect(() => {
    console.log(
      "Text expansion state changed - isTextExpanded:",
      isTextExpanded
    );
  }, [isTextExpanded]);

  // Connection handling functions
  const handleConditionChange = (condition: string) => {
    onUpdate({
      ...agent,
      connection: { ...agent.connection, type: "conditional", condition },
    });
  };

  const handlePresetSelect = (preset: (typeof CONDITION_PRESETS)[0]) => {
    handleConditionChange(preset.condition);
    setShowConditionInput(false);
  };

  const setButtonPosition = (
    key: keyof typeof buttonPositions,
    rect: DOMRect
  ) => {
    setButtonPositions((prev) => ({ ...prev, [key]: rect }));
  };

  const getModalPosition = (buttonRect?: DOMRect, width = 200) => {
    if (!buttonRect) return {};

    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const shouldShowAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

    return {
      [shouldShowAbove ? "bottom" : "top"]: shouldShowAbove
        ? `${window.innerHeight - buttonRect.top + window.scrollY + 8}px`
        : `${buttonRect.bottom + window.scrollY + 8}px`,
      left: `${Math.max(
        8,
        Math.min(
          buttonRect.left + window.scrollX,
          window.innerWidth - width - 8
        )
      )}px`,
      minWidth: `${Math.min(width, window.innerWidth - 16)}px`,
    };
  };

  const startAutoCollapseTimer = () => {
    // Clear existing timeout
    if (autoCollapseTimeout) {
      clearTimeout(autoCollapseTimeout);
    }

    // Set new 5-second timeout to auto-collapse
    const timeout = setTimeout(() => {
      setIsTextExpanded(false);
      setAutoCollapseTimeout(null);
    }, 5000);

    setAutoCollapseTimeout(timeout);
  };

  const handleModelSelectorClick = (e: React.MouseEvent) => {
    console.log(
      "Model selector clicked, isTextExpanded:",
      isTextExpanded,
      "isModelDropdownOpen:",
      isModelDropdownOpen
    );

    if (isTextExpanded) {
      // Text is already expanded, second click opens modal
      console.log("Opening modal...");
      setButtonPosition("model", e.currentTarget.getBoundingClientRect());
      setIsModelDropdownOpen(true); // Always set to true on second click
      // Clear auto-collapse timer since modal is opening
      if (autoCollapseTimeout) {
        clearTimeout(autoCollapseTimeout);
        setAutoCollapseTimeout(null);
      }
    } else {
      // First click - expand text and start auto-collapse timer
      console.log("Expanding text...");
      setIsTextExpanded(true);
      startAutoCollapseTimer();
    }
  };

  const renderModelSelector = () => (
    <div className="relative hover:cursor-pointer" data-dropdown>
      <button
        onClick={handleModelSelectorClick}
        className={`flex items-center p-2 rounded-2xl group bg-gray-700/50 group hover:bg-gray-700/80 text-gray-500 transition-all duration-300 ease-out  overflow-hidden ${
          isTextExpanded ? "pr-3" : ""
        }`}
        data-dropdown
      >
        {currentProvider && (
          <currentProvider.icon
            size={16}
            className={`${STYLES.iconSize} ${currentProvider.iconColor} flex-shrink-0`}
          />
        )}
        <div
          className={`flex items-center transition-all duration-300 ease-out ${
            isTextExpanded
              ? "ml-2 max-w-32 opacity-100"
              : "ml-0 max-w-0 opacity-0"
          }`}
        >
          <span className="font-medium truncate group-hover:text-lavender-400 whitespace-nowrap text-xs">
            {selectedModel?.label}
          </span>
          {isTextExpanded && (
            <SquareArrowOutUpRight
              size={16}
              className="ml-1.5 flex-shrink-0 text-gray-500 group-hover:text-lavender-400 "
            />
          )}
        </div>
      </button>

      {isModelDropdownOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999]" style={{ zIndex: 999999 }}>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setIsModelDropdownOpen(false);
                setIsTextExpanded(false);
                setSearchQuery("");
                setFocusedModelIndex(-1);
              }}
            />
            <div className="fixed inset-x-4 top-[50%] md:inset-x-auto md:left-1/2 md:right-auto transform -translate-y-1/2 md:-translate-x-1/2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl w-auto md:w-[28rem] max-h-[85vh] md:max-h-[800px] z-[999999] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
              {/* Header with Search */}
              <div className="p-4 md:p-5 border-b border-gray-700/30 bg-gradient-to-b from-gray-800/50 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base md:text-lg font-semibold text-white">
                    Select AI Model
                  </h3>
                  <button
                    onClick={() => {
                      setIsModelDropdownOpen(false);
                      setIsTextExpanded(false);
                      setSearchQuery("");
                      setFocusedModelIndex(-1);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedModelIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      const allModels = Object.values(MODEL_PROVIDERS).flatMap(
                        (p) => p.models
                      );
                      const filteredModels = allModels.filter(
                        (m) =>
                          m.label
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          m.value
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                      );

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setFocusedModelIndex((prev) =>
                          prev < filteredModels.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setFocusedModelIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredModels.length - 1
                        );
                      } else if (e.key === "Enter" && focusedModelIndex >= 0) {
                        e.preventDefault();
                        const selectedModel = filteredModels[focusedModelIndex];
                        if (selectedModel) {
                          onUpdate({ ...agent, model: selectedModel.value });
                          setIsModelDropdownOpen(false);
                          setIsTextExpanded(false);
                          setSearchQuery("");
                          setFocusedModelIndex(-1);
                        }
                      }
                    }}
                    placeholder="Search models..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-500/50 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                {/* Top Models Bar (Desktop Only) */}
                {searchQuery === "" && (
                  <div className="hidden md:flex items-center justify-between gap-2 py-2 pt-8">
                    <span className="text-xs text-gray-400 font-medium">
                      Popular:
                    </span>
                    <div className="flex items-center gap-2">
                      {[
                        {
                          value: "o4-mini-2025-04-16",
                          label: "o4 Mini",
                          provider: "openai",
                        },
                        { value: "grok-3", label: "Grok 3", provider: "xai" },
                        {
                          value: "claude-3-7-sonnet-20250219",
                          label: "Claude 3.7",
                          provider: "anthropic",
                        },
                      ].map((topModel) => {
                        const isTopModelSelected =
                          agent.model === topModel.value;
                        const provider =
                          MODEL_PROVIDERS[
                            topModel.provider as keyof ModelProviders
                          ];

                        return (
                          <button
                            key={topModel.value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onUpdate({ ...agent, model: topModel.value });
                              setIsModelDropdownOpen(false);
                              setIsTextExpanded(false);
                              setSearchQuery("");
                              setFocusedModelIndex(-1);
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isTopModelSelected
                                ? "bg-lavender-500/20 text-lavender-400 border border-lavender-500/30"
                                : "bg-gray-700/40 text-gray-300 hover:bg-gray-700/60 hover:text-white border border-transparent"
                            }`}
                          >
                            <provider.icon
                              size={12}
                              className={provider.iconColor}
                            />
                            <span className="group-hover:text-lavender-400 whitespace-nowrap">
                              {topModel.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Models List */}
              <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-gray-800/50 scrollbar-thumb-gray-700/50">
                {(() => {
                  const filteredProviders = Object.entries(MODEL_PROVIDERS)
                    .map(([key, provider]) => ({
                      key,
                      provider,
                      models: provider.models.filter(
                        (model: ModelConfig) =>
                          searchQuery === "" ||
                          model.label
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          model.value
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          model.description
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          model.capabilities?.some((cap: string) =>
                            cap
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          )
                      ),
                    }))
                    .filter(({ models }) => models.length > 0);

                  let globalIndex = 0;

                  if (filteredProviders.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <div className="text-gray-400 mb-2">
                          No models found
                        </div>
                        <div className="text-sm text-gray-500">
                          Try a different search term
                        </div>
                      </div>
                    );
                  }

                  return filteredProviders.map(({ key, provider, models }) => (
                    <div
                      key={key}
                      className="border-b border-gray-800/30 last:border-0"
                    >
                      {/* Provider Header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 backdrop-blur-xl sticky top-0 z-10">
                        <provider.icon
                          size={16}
                          className={provider.iconColor}
                        />
                        <span className="text-sm font-medium text-gray-300">
                          {provider.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {models.length} model{models.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Models List */}
                      <div className="py-1">
                        {models.map((model: ModelConfig) => {
                          const isActuallySelected =
                            agent.model === model.value;
                          const isFallbackShown =
                            (!agent.model || agent.model.trim() === "") &&
                            model.value === "gpt-4o";
                          const isSelected = isActuallySelected;
                          const isFocused = globalIndex === focusedModelIndex;
                          const currentIndex = globalIndex++;

                          return (
                            <button
                              key={model.value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onUpdate({ ...agent, model: model.value });
                                setIsModelDropdownOpen(false);
                                setIsTextExpanded(false);
                                setSearchQuery("");
                                setFocusedModelIndex(-1);
                              }}
                              onMouseEnter={() =>
                                setFocusedModelIndex(currentIndex)
                              }
                              className={`w-full px-4 md:px-5 py-3 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-lavender-500/15 text-lavender-400 border-l-2 border-lavender-500"
                                  : isFallbackShown
                                    ? "bg-blue-500/10 text-blue-400"
                                    : isFocused
                                      ? "bg-gray-700/40 text-white"
                                      : "text-gray-200 hover:bg-gray-700/30 hover:text-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">
                                      {model.label}
                                    </span>
                                    {isSelected && (
                                      <span className="text-xs px-2 py-0.5 bg-lavender-500/20 rounded-full">
                                        Active
                                      </span>
                                    )}
                                    {isFallbackShown && !isSelected && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 rounded-full">
                                        Default
                                      </span>
                                    )}
                                  </div>

                                  {model.description && (
                                    <p className="text-xs text-gray-400 mb-2 pr-2">
                                      {model.description}
                                    </p>
                                  )}

                                  {model.capabilities && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {model.capabilities
                                        .slice(0, 3)
                                        .map(
                                          (capability: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className="text-xs px-2 py-0.5 bg-gray-700/40 text-gray-300 rounded-md"
                                            >
                                              {capability}
                                            </span>
                                          )
                                        )}
                                    </div>
                                  )}
                                </div>

                                {/* Modality Icons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                                  {model.modalities.map((modality: string) => (
                                    <div
                                      key={modality}
                                      className="relative group/tooltip"
                                    >
                                      <div className="p-1.5 rounded-lg bg-gray-700/30 transition-colors group-hover/tooltip:bg-gray-700/50">
                                        <ModalityIcon
                                          type={modality}
                                          className="text-gray-400 group-hover/tooltip:text-white transition-colors"
                                        />
                                      </div>
                                      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                        {modality.charAt(0).toUpperCase() +
                                          modality.slice(1)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div className="p-3 md:p-4 border-t border-gray-700/30 bg-gradient-to-t from-gray-800/50 to-transparent">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300">
                        ↑↓
                      </kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300">
                        Enter
                      </kbd>
                      Select
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300">
                      Esc
                    </kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );

  const renderEnhancedOptions = () => {
    const providerKey = getProviderKey(agent.model);

    // Only show enhanced options for Grok and Claude models
    if (providerKey !== "xai" && providerKey !== "anthropic") {
      return null;
    }

    return (
      <ToolButton
        provider={providerKey}
        grokOptions={agent.grokOptions}
        claudeOptions={agent.claudeOptions}
        onGrokOptionsChange={(options) =>
          onUpdate({
            ...agent,
            grokOptions: options,
          })
        }
        onClaudeOptionsChange={(options) =>
          onUpdate({
            ...agent,
            claudeOptions: {
              ...agent.claudeOptions,
              enableTools: options.enableTools,
              toolSet: options.toolSet as
                | "webSearch"
                | "fileAnalysis"
                | "computerUse"
                | "full",
            },
          })
        }
        className="ml-2"
      />
    );
  };

  const { showDetailedPerformance, togglePerformance } = usePerformance();

  // Handle mobile collapse - use screen width to determine if it should be collapsed
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024; // lg breakpoint
  if (isMobileCollapsed && isMobile) {
    return null; // Don't render anything when collapsed on mobile
  }

  return (
    <div
      className={`relative flex flex-col ${isLastAgent ? "mx-0 mb-0" : "mx-2 mb-2"} lg:mx-0 lg:mb-0 ${isLastAgent ? "rounded-t-3xl lg:rounded-3xl border-y-0 border-x-0 lg:border-y lg:border-x" : "rounded-3xl"} border border-gray-600/50 bg-slate-800/90 backdrop-blur-lg hover:backdrop-blur-xl hover:border-lavender-400/20 animate-none`}
    >
      <textarea
        value={agent.prompt}
        onChange={(e) => {
          onUpdate({ ...agent, prompt: e.target.value });
          // Trigger resize on next frame to ensure the value has been updated
          setTimeout(adjustTextareaHeight, 0);
        }}
        onFocus={() => setIsTextareaFocused(true)}
        onBlur={() => setIsTextareaFocused(false)}
        placeholder="Ask anything"
        className={`w-full p-4 h-auto ${isLastAgent ? "rounded-t-3xl" : "rounded-t-3xl"} min-h-8 max-h-32 lg:max-h-64 bg-transparent text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-0 outline-none resize-none transition-all overflow-y-auto`}
        style={{ fontSize: "16px" }}
        ref={textareaRef}
      />

      {/* Bottom controls - absolutely positioned */}
      <div
        className={`flex flex-row lg:items-center justify-between ${isTextareaFocused || !isLastAgent ? "pb-4" : "pb-8"} p-4 lg:pb-4 overflow-hidden gap-1.5 lg:gap-2`}
      >
        <div className="block lg:hidden">
          {/* Modality Icons */}
          <div className="flex items-center gap-1">
            {renderModelSelector()}
            {/* Tool Button for mobile */}
            {renderEnhancedOptions()}
            {/* Copy Button for mobile */}
            {showCopyButton && onCopyPrompt && (
              <button
                onClick={onCopyPrompt}
                className="flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-lavender-400 hover:bg-gray-700/50 transition-all"
                title="Copy prompt to all other agents"
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        </div>
        {/* Left side controls */}
        <div className="hidden lg:flex items-center gap-1 flex-wrap">
          {renderModelSelector()}
          {/* Tool Button */}
          {renderEnhancedOptions()}
          {/* Copy Button */}
          {showCopyButton && onCopyPrompt && (
            <button
              onClick={onCopyPrompt}
              className="flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-lavender-400 hover:bg-gray-700/50 transition-all"
              title="Copy prompt to all other agents"
            >
              <Copy size={16} />
            </button>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* Performance Toggle */}
          {/* <button
              onClick={togglePerformance}
              className={`flex items-center justify-center p-1.5 lg:p-2 rounded-md transition-all ${
                showDetailedPerformance
                  ? "text-lavender-400 bg-lavender-500/20 hover:bg-lavender-500/30"
                  : "text-gray-400 hover:text-lavender-400 hover:bg-gray-700/50"
              }`}
              title={
                showDetailedPerformance
                  ? "Hide detailed performance"
                  : "Show detailed performance"
              }
            >
              <BarChart3 size={16} className="lg:w-4 lg:h-4" />
            </button> */}

          {/* Modality Icons */}
          <ModalityIcons
            selectedModel={effectiveModelValue}
            onImagesChange={(images) => onUpdate({ ...agent, images })}
            onWebSearchToggle={(enabled) =>
              onUpdate({ ...agent, webSearchEnabled: enabled })
            }
            isWebSearchEnabled={agent.webSearchEnabled}
            images={agent.images || []}
          />

          {isLastAgent && onSendChain && (
            <button
              onClick={onSendChain}
              disabled={!canSend}
              className={`flex items-center gap-2 p-2 rounded-full transition-all ${
                canSend && !isLoading
                  ? "bg-lavender-500 hover:bg-lavender-600 text-white shadow-lg hover:shadow-lavender-500/25 hover:scale-105"
                  : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
