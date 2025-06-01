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
} from "lucide-react";
import { SiOpenai, SiClaude } from "react-icons/si";
import { UploadedImage } from "./modality/ImageUpload";
import { WebSearchData } from "./modality/WebSearch";
import { ModalityIcons } from "./modality/ModalityIcons";
import { CONDITION_PRESETS } from "@/lib/constants";
import { ToolButton } from "./ui/ToolButton";

export interface Agent {
  id: string;
  model: string;
  prompt: string;
  name?: string;
  connection?: {
    type: "direct" | "conditional" | "parallel";
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
}

interface AgentInputProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  index: number;
  isLastAgent?: boolean;
  onSendChain?: () => void;
  canSend?: boolean;
  isLoading?: boolean;
}

// Grok Icon Component
const GrokIcon = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 24 24"
    className={className}
  >
    <path d="m19.25 5.08-9.52 9.67 6.64-4.96c.33-.24.79-.15.95.23.82 1.99.45 4.39-1.17 6.03-1.63 1.64-3.89 2.01-5.96 1.18l-2.26 1.06c3.24 2.24 7.18 1.69 9.64-.8 1.95-1.97 2.56-4.66 1.99-7.09-.82-3.56.2-4.98 2.29-7.89L22 2.3zM9.72 14.75h.01zM8.35 15.96c-2.33-2.25-1.92-5.72.06-7.73 1.47-1.48 3.87-2.09 5.97-1.2l2.25-1.05c-.41-.3-.93-.62-1.52-.84a7.45 7.45 0 0 0-8.13 1.65c-2.11 2.14-2.78 5.42-1.63 8.22.85 2.09-.54 3.57-1.95 5.07-.5.53-1 1.06-1.4 1.62z" />
  </svg>
);

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

// Define provider type
type ModelProvider = {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
  models: Array<{
    value: string;
    label: string;
    modalities: string[];
    description?: string;
    capabilities?: string[];
  }>;
};

type ModelProviders = {
  openai: ModelProvider;
  anthropic: ModelProvider;
  xai: ModelProvider;
};

// Connection types configuration

const MODEL_PROVIDERS: ModelProviders = {
  openai: {
    name: "OpenAI",
    icon: SiOpenai,
    iconColor: "text-white",
    bgColor: "bg-[#000000]",
    models: [
      // Reasoning Models (High Priority)
      {
        value: "o1",
        label: "o1",
        modalities: ["text", "reasoning"],
        description: "Most advanced reasoning model for complex problems",
        capabilities: [
          "Advanced reasoning",
          "Mathematical analysis",
          "Complex problem solving",
        ],
      },
      {
        value: "o1-mini",
        label: "o1 Mini",
        modalities: ["text", "reasoning", "fast"],
        description: "Cost-effective reasoning model",
        capabilities: [
          "Logical reasoning",
          "Cost-efficient",
          "Faster responses",
        ],
      },
      {
        value: "o1-pro",
        label: "o1 Pro",
        modalities: ["text", "reasoning"],
        description: "Premium reasoning model with enhanced capabilities",
        capabilities: [
          "Premium reasoning",
          "Extended thinking",
          "Complex analysis",
        ],
      },

      // Flagship Models
      {
        value: "gpt-4o",
        label: "GPT-4o",
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
        label: "GPT-4o Mini",
        modalities: ["text", "vision", "fast"],
        description: "Fast and cost-effective multimodal model",
        capabilities: ["Quick responses", "Vision analysis", "Cost-efficient"],
      },

      // Latest Models
      {
        value: "gpt-4.5-preview",
        label: "GPT-4.5 Preview",
        modalities: ["text", "vision", "code"],
        description: "Latest preview model with cutting-edge capabilities",
        capabilities: [
          "Latest features",
          "Enhanced performance",
          "Advanced reasoning",
        ],
      },
      {
        value: "gpt-4.1",
        label: "GPT-4.1",
        modalities: ["text", "vision", "code"],
        description: "Enhanced GPT-4 with improved capabilities",
        capabilities: [
          "Improved reasoning",
          "Better code generation",
          "Enhanced accuracy",
        ],
      },

      // Specialized Models
      {
        value: "o3-mini-2025-01-31",
        label: "o3 Mini",
        modalities: ["text", "reasoning"],
        description: "Next-generation reasoning model",
        capabilities: [
          "Advanced reasoning",
          "Efficient processing",
          "Mathematical expertise",
        ],
      },
      {
        value: "o4-mini-2025-04-16",
        label: "o4 Mini",
        modalities: ["text", "reasoning", "fast"],
        description: "Latest generation reasoning model",
        capabilities: [
          "State-of-the-art reasoning",
          "Optimized performance",
          "Complex analysis",
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
      // Claude 4 Series (Latest)
      {
        value: "claude-sonnet-4-20250514",
        label: "Claude Sonnet 4",
        modalities: ["text", "vision", "code", "reasoning"],
        description: "High-performance model with exceptional reasoning",
        capabilities: [
          "Advanced coding",
          "Complex reasoning",
          "Vision analysis",
        ],
      },
      {
        value: "claude-opus-4-20250514",
        label: "Claude Opus 4",
        modalities: ["text", "vision", "code", "reasoning"],
        description: "Most capable and intelligent Claude model",
        capabilities: [
          "Superior reasoning",
          "Advanced analysis",
          "Complex problem solving",
        ],
      },

      // Claude 3.7 Series
      {
        value: "claude-3-7-sonnet-20250219",
        label: "Claude Sonnet 3.7",
        modalities: ["text", "vision", "reasoning"],
        description: "Enhanced model with extended thinking capabilities",
        capabilities: [
          "Extended thinking",
          "Deep analysis",
          "Thoughtful responses",
        ],
      },

      // Claude 3.5 Series (Proven)
      {
        value: "claude-3-5-sonnet-20241022",
        label: "Claude 3.5 Sonnet",
        modalities: ["text", "vision", "code", "reasoning"],
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
      // Grok 3 Series (Latest)
      {
        value: "grok-3",
        label: "Grok 3",
        modalities: ["text", "reasoning", "web"],
        description: "Flagship model with real-time data access",
        capabilities: [
          "Real-time data",
          "Market analysis",
          "Deep domain knowledge",
        ],
      },
      {
        value: "grok-3-mini",
        label: "Grok 3 Mini",
        modalities: ["text", "reasoning"],
        description: "Lightweight model with strong reasoning",
        capabilities: [
          "Cost-effective",
          "Quick reasoning",
          "Reliable analysis",
        ],
      },
      {
        value: "grok-3-fast",
        label: "Grok 3 Fast",
        modalities: ["text", "fast"],
        description: "Optimized for speed and real-time applications",
        capabilities: ["High speed", "Real-time processing", "Low latency"],
      },
      {
        value: "grok-3-mini-fast",
        label: "Grok 3 Mini Fast",
        modalities: ["text", "fast"],
        description: "Balance of speed and cost-effectiveness",
        capabilities: ["Fast responses", "Cost-efficient", "Reliable"],
      },

      // Grok 2 Series (Multimodal)
      {
        value: "grok-2-vision-1212",
        label: "Grok 2 Vision",
        modalities: ["vision", "image"],
        description: "Advanced image understanding and analysis",
        capabilities: [
          "Visual analysis",
          "Image processing",
          "Multimodal reasoning",
        ],
      },
      {
        value: "grok-2-1212",
        label: "Grok 2",
        modalities: ["text", "reasoning"],
        description: "Proven model for text analysis and reasoning",
        capabilities: ["Text analysis", "Logical reasoning", "Problem solving"],
      },
    ],
  },
};

// Style constants
const STYLES = {
  card: "bg-gray-800/70 backdrop-blur-sm border border-gray-600/50",
  button:
    "bg-gray-800/90 border border-gray-600/50 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 transition-all text-xs backdrop-blur-sm",
  modal:
    "fixed bg-gray-800/98 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[999999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
  backdrop: "fixed inset-0 z-[999999] bg-black/20",
  backdropBlur: "fixed inset-0 z-[999999] bg-black/30",
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
}: AgentInputProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [buttonPositions, setButtonPositions] = useState<{
    model?: DOMRect | null;
    condition?: DOMRect | null;
  }>({});
  const [showConditionInput, setShowConditionInput] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getProviderKey = (modelValue: string): keyof ModelProviders => {
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
    return "openai"; // Default fallback
  };

  const currentProvider = (() => {
    const providerKey = getProviderKey(agent.model);
    return MODEL_PROVIDERS[providerKey];
  })();

  const selectedModel = (() => {
    const providerKey = getProviderKey(agent.model);
    return MODEL_PROVIDERS[providerKey]?.models.find(
      (m) => m.value === agent.model
    );
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
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const renderModelSelector = () => (
    <div className="relative">
      <button
        onClick={(e) => {
          setButtonPosition("model", e.currentTarget.getBoundingClientRect());
          setIsModelDropdownOpen(!isModelDropdownOpen);
        }}
        className={`flex items-center ${STYLES.gap} ${STYLES.padding} rounded-md group ${STYLES.button}`}
      >
        {currentProvider && (
          <currentProvider.icon
            size={12}
            className={`${STYLES.iconSize} ${currentProvider.iconColor} flex-shrink-0`}
          />
        )}
        <span className="font-medium truncate max-w-16 md:max-w-24 text-xs">
          {selectedModel?.label}
        </span>
        <ChevronDown
          size={10}
          className={`${STYLES.iconSizeSmall} text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isModelDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isModelDropdownOpen &&
        createPortal(
          <>
            <div
              className={STYLES.backdropBlur}
              onClick={() => setIsModelDropdownOpen(false)}
            />
            <div
              className={`${STYLES.modal} w-[90vw] md:w-96 max-h-[80vh] flex flex-col`}
              style={getModalPosition(buttonPositions.model || undefined, 384)}
            >
              {/* Header with Search */}
              <div className="p-3 border-b border-gray-700/50 bg-gray-800/30">
                <div className={`flex items-center ${STYLES.gap} mb-2`}>
                  <h3
                    className={`${STYLES.textResponsive} font-medium text-white`}
                  >
                    Select Model
                  </h3>
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() => setIsModelDropdownOpen(false)}
                      className={`p-1 text-gray-400 hover:text-white ${STYLES.hoverButton}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search models..."
                    className={`w-full pl-8 pr-3 py-1.5 rounded text-xs focus:ring-1 ${STYLES.input}`}
                  />
                </div>
              </div>

              {/* Models List */}
              <div className="flex-1 overflow-y-auto">
                {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (
                  <div
                    key={key}
                    className="border-b border-gray-700/50 last:border-0"
                  >
                    {/* Provider Header */}
                    <div
                      className={`flex items-center ${STYLES.gap} px-3 py-2 text-gray-400 bg-gray-800/30 sticky top-0`}
                    >
                      <provider.icon size={14} className={provider.iconColor} />
                      <span className={`${STYLES.textResponsive} font-medium`}>
                        {provider.name}
                      </span>
                    </div>

                    {/* Models List */}
                    <div className="py-1">
                      {provider.models.map((model) => {
                        const isSelected = agent.model === model.value;
                        return (
                          <button
                            key={model.value}
                            onClick={() => {
                              onUpdate({ ...agent, model: model.value });
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left ${STYLES.textResponsive} transition-colors hover:bg-gray-700/50 ${
                              isSelected
                                ? "bg-lavender-500/10 text-lavender-400"
                                : "text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`flex items-center ${STYLES.gap}`}
                                >
                                  <span className="font-medium truncate">
                                    {model.label}
                                  </span>
                                  {isSelected && (
                                    <span className="text-lavender-400 text-xs">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Modality Icons */}
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                {model.modalities.map((modality) => (
                                  <div
                                    key={modality}
                                    className="relative group/tooltip"
                                    title={
                                      modality.charAt(0).toUpperCase() +
                                      modality.slice(1)
                                    }
                                  >
                                    <ModalityIcon
                                      type={modality}
                                      className="text-gray-400 hover:text-white transition-colors"
                                    />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-60">
                                      {modality.charAt(0).toUpperCase() +
                                        modality.slice(1)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {model.capabilities && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {model.capabilities
                                  .slice(0, 3)
                                  .map((capability, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded"
                                    >
                                      {capability}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>,
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

  return (
    <div className="relative flex flex-col mx-2 md:mx-0 rounded-xl border hover:bg-gray-700/80 border-gray-500/50">
      <textarea
        value={agent.prompt}
        onChange={(e) => {
          onUpdate({ ...agent, prompt: e.target.value });
          // Trigger resize on next frame to ensure the value has been updated
          setTimeout(adjustTextareaHeight, 0);
        }}
        placeholder="Ask anything"
        className={`w-full p-4 h-auto rounded-t-xl min-h-12 md:min-h-16 max-h-32 md:max-h-64 ${STYLES.card} text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-0 outline-none resize-none transition-all text-sm overflow-y-auto`}
        ref={textareaRef}
      />

      {/* Seamless input container */}
      <div
        className={`relative h-full min-h-10 md:min-h-16 ${STYLES.card} border-none rounded-b-xl`}
      >
        {/* Bottom controls - absolutely positioned with gradient background */}
        <div
          className={`absolute bottom-0 left-0 right-0 flex flex-row md:items-center rounded-b-xl justify-between px-2 md:px-4 py-1.5 md:py-3 overflow-hidden ${STYLES.gap} md:gap-0`}
        >
          <div className="block md:hidden">
            {/* Modality Icons */}
            <div className="flex items-center gap-1.5">
              <ModalityIcons
                selectedModel={agent.model}
                onImagesChange={(images) => onUpdate({ ...agent, images })}
                onWebSearchToggle={(enabled) =>
                  onUpdate({ ...agent, webSearchEnabled: enabled })
                }
                isWebSearchEnabled={agent.webSearchEnabled}
                images={agent.images || []}
              />

              {/* Tool Button for mobile */}
              {renderEnhancedOptions()}
            </div>
          </div>
          {/* Left side controls */}
          <div
            className={`hidden md:flex items-center ${STYLES.gap} flex-wrap`}
          >
            {renderModelSelector()}
            {/* Tool Button */}
            {renderEnhancedOptions()}
            {/* Modality Icons */}
            <ModalityIcons
              selectedModel={agent.model}
              onImagesChange={(images) => onUpdate({ ...agent, images })}
              onWebSearchToggle={(enabled) =>
                onUpdate({ ...agent, webSearchEnabled: enabled })
              }
              isWebSearchEnabled={agent.webSearchEnabled}
              images={agent.images || []}
            />
          </div>

          {/* Right side controls */}
          {isLastAgent && onSendChain && (
            <button
              onClick={onSendChain}
              disabled={!canSend}
              className={`flex items-center ${STYLES.gap} px-3 md:px-4 py-1.5 md:py-2 bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-400 whitespace-nowrap rounded-lg font-bold transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none text-xs backdrop-blur-sm w-min justify-center`}
            >
              <span className="truncate">
                {isLoading ? "Running..." : "Chain"}
              </span>

              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${STYLES.iconSize} flex-shrink-0`}
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
