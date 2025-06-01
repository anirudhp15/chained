"use client";

import { useState } from "react";
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
  ChevronUp,
  GitCommitHorizontal,
  GitFork,
  Pencil,
} from "lucide-react";
import { SiOpenai, SiClaude } from "react-icons/si";
import { IoGitBranchOutline } from "react-icons/io5";
import { UploadedImage } from "./modality/ImageUpload";
import { WebSearchData } from "./modality/WebSearch";
import { ModalityIcons } from "./modality/ModalityIcons";
import {
  CONNECTION_TYPES,
  CONDITION_PRESETS,
  type EnabledConnectionType,
} from "@/lib/constants";

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
}

interface AgentInputProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
  onAddAgent?: () => void;
  canAddAgent?: boolean;
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
  const iconProps = { size: 12, className: `${className}` };

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
      {
        value: "gpt-4o",
        label: "GPT-4o",
        modalities: ["text", "vision", "audio", "code"],
        description: "Multimodal flagship model with real-time capabilities",
        capabilities: [
          "Real-time reasoning",
          "Voice interaction",
          "Image generation",
        ],
      },
      {
        value: "gpt-4o-mini",
        label: "GPT-4o Mini",
        modalities: ["text", "audio"],
        description: "Lightweight model optimized for speech-to-text",
        capabilities: ["Enhanced transcription", "Language recognition"],
      },
      {
        value: "gpt-4-turbo",
        label: "GPT-4 Turbo",
        modalities: ["text", "fast"],
        description: "High-speed processing with extended context",
        capabilities: ["128K tokens", "Large-scale processing"],
      },
      {
        value: "gpt-4",
        label: "GPT-4",
        modalities: ["text", "reasoning"],
        description: "Advanced reasoning and creative writing",
        capabilities: ["Complex reasoning", "Technical writing"],
      },
      {
        value: "gpt-3.5-turbo",
        label: "GPT-3.5 Turbo",
        modalities: ["text", "fast"],
        description: "Efficient performance for general tasks",
        capabilities: ["Cost-effective", "General purpose"],
      },
    ],
  },
  anthropic: {
    name: "Anthropic",
    icon: SiClaude,
    iconColor: "text-[#da7756]",
    bgColor: "bg-[#000000]",
    models: [
      {
        value: "claude-3-5-sonnet-20241022",
        label: "Claude 3.5 Sonnet",
        modalities: ["text", "vision", "code", "reasoning"],
        description: "Advanced reasoning with computer use capabilities",
        capabilities: ["Code generation", "Vision analysis", "UI navigation"],
      },
      {
        value: "claude-3-5-haiku-20241022",
        label: "Claude 3.5 Haiku",
        modalities: ["text", "vision", "fast"],
        description: "Fast and cost-effective with strong coding",
        capabilities: ["Rapid responses", "Coding tasks", "Cost-efficient"],
      },
      {
        value: "claude-3-sonnet-20240229",
        label: "Claude 3 Sonnet",
        modalities: ["text", "vision"],
        description: "Superior instruction following and tool use",
        capabilities: [
          "Tool selection",
          "Error correction",
          "Complex workflows",
        ],
      },
      {
        value: "claude-3-haiku-20240307",
        label: "Claude 3 Haiku",
        modalities: ["text", "fast"],
        description: "Fast response times for real-time applications",
        capabilities: ["Real-time", "Interactive", "Lightweight"],
      },
    ],
  },
  xai: {
    name: "xAI",
    icon: GrokIcon,
    iconColor: "text-white",
    bgColor: "bg-[#000000]",
    models: [
      {
        value: "grok-3",
        label: "Grok 3",
        modalities: ["text", "vision", "audio", "reasoning", "web"],
        description: "Flagship model with Think and DeepSearch modes",
        capabilities: [
          "Real-time data",
          "Voice interaction",
          "Advanced reasoning",
        ],
      },
      {
        value: "grok-3-mini",
        label: "Grok 3 Mini",
        modalities: ["text", "reasoning"],
        description: "Cost-efficient reasoning for lightweight apps",
        capabilities: ["Cost-effective", "Lightweight", "Reasoning"],
      },
      {
        value: "grok-3-fast",
        label: "Grok 3 Fast",
        modalities: ["text", "fast"],
        description: "Optimized for speed and real-time applications",
        capabilities: ["High speed", "Real-time", "Interactive"],
      },
      {
        value: "grok-3-mini-fast",
        label: "Grok 3 Mini Fast",
        modalities: ["text", "fast"],
        description: "Combines cost-efficiency with speed",
        capabilities: ["Cost-effective", "Fast", "Lightweight"],
      },
      {
        value: "grok-2-1212",
        label: "Grok 2",
        modalities: ["text", "vision", "image"],
        description: "Multimodal with image generation via FLUX",
        capabilities: ["Image generation", "Creative tasks", "Vision analysis"],
      },
      {
        value: "grok-2-vision-1212",
        label: "Grok 2 Vision",
        modalities: ["vision", "image"],
        description: "Enhanced image understanding and generation",
        capabilities: [
          "Visual analysis",
          "Image generation",
          "Creative applications",
        ],
      },
    ],
  },
};

// Style constants
const STYLES = {
  card: "bg-gray-700/70 backdrop-blur-sm border border-gray-600/50",
  button:
    "bg-gray-800/90 border border-gray-600/50 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 transition-all text-xs backdrop-blur-sm",
  modal:
    "fixed bg-gray-800/98 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-[999999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
  backdrop: "fixed inset-0 z-[999999] bg-black/20",
  backdropBlur: "fixed inset-0 z-[999999] bg-black/30 backdrop-blur-sm",
  input:
    "bg-gray-800/90 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50",
} as const;

export function AgentInput({
  agent,
  onUpdate,
  onRemove,
  canRemove,
  index,
  onAddAgent,
  canAddAgent,
  isLastAgent,
  onSendChain,
  canSend,
  isLoading,
}: AgentInputProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(agent.name || "");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isConnectionDropdownOpen, setIsConnectionDropdownOpen] =
    useState(false);
  const [isConditionDropdownOpen, setIsConditionDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [buttonPositions, setButtonPositions] = useState<{
    model?: DOMRect;
    connection?: DOMRect;
    condition?: DOMRect;
  }>({});

  // Get provider key from model, handling gpt-4o-mini case
  const getProviderKey = (modelValue: string): keyof ModelProviders => {
    if (modelValue.startsWith("gpt-")) return "openai";
    if (modelValue.startsWith("claude-")) return "anthropic";
    if (modelValue.startsWith("grok-")) return "xai";
    return "openai"; // default fallback
  };

  const providerKey = getProviderKey(agent.model);
  const selectedModel = MODEL_PROVIDERS[providerKey]?.models.find(
    (m: { value: string; label: string }) => m.value === agent.model
  );

  // Get the provider for the current model
  const currentProvider = MODEL_PROVIDERS[providerKey];

  // Filter models based on search query
  const filteredProviders = Object.entries(MODEL_PROVIDERS)
    .map(([key, provider]) => ({
      key,
      ...provider,
      models: provider.models.filter(
        (model) =>
          model.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          provider.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((provider) => provider.models.length > 0);

  // Connection handling functions
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
    setShowConditionInput(type === "conditional");
    setIsConnectionDropdownOpen(false);
  };

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

  // Current connection info
  const currentConnectionType = agent.connection?.type || "direct";
  const currentConnection = CONNECTION_TYPES.find(
    (c) => c.type === currentConnectionType
  );
  const CurrentConnectionIcon = currentConnection?.Icon;

  const handleAddAgent = () => {
    if (onAddAgent) {
      setIsAddingAgent(true);
      onAddAgent();

      // Reset animation state after animation
      setTimeout(() => {
        setIsAddingAgent(false);
      }, 200);
    }
  };

  const setButtonPosition = (
    key: keyof typeof buttonPositions,
    rect: DOMRect
  ) => {
    setButtonPositions((prev) => ({ ...prev, [key]: rect }));
  };

  const getModalPosition = (buttonRect?: DOMRect, width = 200) => ({
    top: `${(buttonRect?.top || 0) + window.scrollY - 8}px`,
    left: `${Math.max(16, Math.min(buttonRect?.left || 0, window.innerWidth - width))}px`,
    transform: "translateY(-100%)",
  });

  const renderNameEditor = () => (
    <div className="flex items-center gap-2 py-1.5">
      {isEditingName ? (
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={() => {
            setIsEditingName(false);
            if (tempName.trim()) {
              onUpdate({ ...agent, name: tempName.trim() });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setIsEditingName(false);
              if (tempName.trim()) {
                onUpdate({ ...agent, name: tempName.trim() });
              }
            }
          }}
          className={`w-32 px-2 rounded text-xs focus:ring-1 ${STYLES.input}`}
          placeholder={`Node ${index + 1}`}
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setIsEditingName(true);
            setTempName(agent.name || "");
          }}
          className="flex items-center gap-2 text-xs font-medium text-lavender-400 hover:text-lavender-300 transition-colors group"
        >
          <span>{agent.name || `Node ${index + 1}`}</span>
          <Pencil size={12} className="opacity-50 group-hover:opacity-100" />
        </button>
      )}
    </div>
  );

  const renderConnectionSelector = () => {
    if (index === 0) return null;

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            setButtonPosition(
              "connection",
              e.currentTarget.getBoundingClientRect()
            );
            setIsConnectionDropdownOpen(!isConnectionDropdownOpen);
          }}
          className={`flex items-center gap-2 px-3 py-1 rounded-md group ${STYLES.button}`}
        >
          {CurrentConnectionIcon && (
            <span
              className={`${currentConnection?.color || "text-gray-400"} ${currentConnection?.iconRotate || ""}`}
            >
              <CurrentConnectionIcon size={14} />
            </span>
          )}
          <span className="font-medium text-xs">
            {currentConnection?.label}
          </span>
          <ChevronUp
            size={10}
            className={`text-gray-400 group-hover:text-lavender-400 transition-all ${
              isConnectionDropdownOpen ? "rotate-0" : "rotate-90"
            }`}
          />
        </button>

        {isConnectionDropdownOpen &&
          createPortal(
            <>
              <div
                className={STYLES.backdrop}
                onClick={() => setIsConnectionDropdownOpen(false)}
              />
              <div
                className={`${STYLES.modal} min-w-48 w-max`}
                style={getModalPosition(buttonPositions.connection)}
              >
                {CONNECTION_TYPES.map((type) => {
                  const TypeIcon = type.Icon;
                  const isSelected = currentConnectionType === type.type;
                  return (
                    <button
                      key={type.type}
                      onClick={() =>
                        !type.disabled && handleConnectionTypeChange(type.type)
                      }
                      disabled={type.disabled}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg flex items-center gap-3 transition-colors text-xs ${
                        isSelected
                          ? "bg-lavender-500/10 text-lavender-400"
                          : "text-white"
                      }`}
                    >
                      <span
                        className={`${type.color} ${type.iconRotate || ""}`}
                      >
                        <TypeIcon size={14} />
                      </span>
                      <div className="flex-1">
                        <div
                          className={`font-medium ${isSelected ? "text-lavender-400" : ""}`}
                        >
                          {type.label}
                          {isSelected && (
                            <span className="ml-2 text-xs opacity-60">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {type.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )}
      </div>
    );
  };

  const renderConditionalInput = () => {
    if (index === 0 || currentConnectionType !== "conditional") return null;

    return (
      <div className="flex items-center gap-2 relative">
        <div className="relative">
          <input
            type="text"
            value={agent.connection?.condition || ""}
            onChange={(e) => handleConditionChange(e.target.value)}
            placeholder="Enter condition..."
            className={`w-40 px-2 py-1 rounded-md text-xs ${STYLES.input}`}
            onFocus={(e) => {
              setButtonPosition(
                "condition",
                e.currentTarget.getBoundingClientRect()
              );
              setShowConditionInput(true);
            }}
            onBlur={() => setTimeout(() => setShowConditionInput(false), 150)}
          />

          {showConditionInput &&
            createPortal(
              <div
                className={`${STYLES.modal} w-64 p-2`}
                style={getModalPosition(buttonPositions.condition, 272)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">
                    Quick presets:
                  </span>
                  <button
                    onClick={() => setShowConditionInput(false)}
                    className="text-gray-400 hover:text-white text-xs hover:bg-gray-700/50 w-5 h-5 rounded flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {CONDITION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full px-2 py-1.5 text-left text-white hover:bg-gray-600/70 rounded text-xs transition-colors"
                    >
                      <div className="font-medium text-lavender-400">
                        {preset.label}
                      </div>
                      <div className="text-gray-400 font-mono text-[10px]">
                        {preset.placeholder}
                      </div>
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
        </div>

        <button
          onClick={() => setShowConditionInput(!showConditionInput)}
          className="p-1 text-gray-400 hover:text-lavender-400 transition-colors hover:bg-gray-700/50 rounded"
          title="Show condition presets"
        >
          <Zap size={12} />
        </button>
      </div>
    );
  };

  const renderModelSelector = () => (
    <div className="relative">
      <button
        onClick={(e) => {
          setButtonPosition("model", e.currentTarget.getBoundingClientRect());
          setIsModelDropdownOpen(!isModelDropdownOpen);
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md group ${STYLES.button}`}
      >
        {currentProvider && (
          <currentProvider.icon
            size={14}
            className={`${currentProvider.iconColor} flex-shrink-0`}
          />
        )}
        <span className="font-medium truncate max-w-20">
          {selectedModel?.label}
        </span>
        <ChevronDown
          size={12}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
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
              className={`${STYLES.modal} w-96 max-h-[80vh] flex flex-col`}
              style={getModalPosition(buttonPositions.model, 400)}
            >
              {/* Header with Search */}
              <div className="p-3 border-b border-gray-700/50 bg-gray-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-white">
                    Select Model
                  </h3>
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() =>
                        setViewMode(
                          viewMode === "compact" ? "detailed" : "compact"
                        )
                      }
                      className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                      title={
                        viewMode === "compact"
                          ? "Detailed view"
                          : "Compact view"
                      }
                    >
                      {viewMode === "compact" ? (
                        <Eye size={12} />
                      ) : (
                        <MessageSquare size={12} />
                      )}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded text-xs focus:ring-1 ${STYLES.input}`}
                  />
                </div>
              </div>

              {/* Models List */}
              <div className="flex-1 overflow-y-auto">
                {filteredProviders.map((provider) => (
                  <div
                    key={provider.key}
                    className="border-b border-gray-700/50 last:border-0"
                  >
                    {/* Provider Header */}
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-400 bg-gray-800/30 sticky top-0">
                      <provider.icon size={14} className={provider.iconColor} />
                      <span className="text-xs font-medium">
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
                            className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700/50 ${
                              isSelected
                                ? "bg-lavender-500/10 text-lavender-400"
                                : "text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {model.label}
                                  </span>
                                  {isSelected && (
                                    <span className="text-lavender-400 text-xs">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                {viewMode === "detailed" &&
                                  model.description && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                                      {model.description}
                                    </p>
                                  )}
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

                            {viewMode === "detailed" && model.capabilities && (
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

                {filteredProviders.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No models found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );

  return (
    <div className="relative flex flex-col">
      {/* Header section */}
      <div
        className={`${STYLES.card} border-b-0 rounded-t-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {renderNameEditor()}
            {renderConnectionSelector()}
            {renderConditionalInput()}
          </div>
          {canRemove && (
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-400 transition-colors p-1 hover:bg-gray-700/50 rounded-md"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={agent.prompt}
        onChange={(e) => onUpdate({ ...agent, prompt: e.target.value })}
        placeholder="Ask anything"
        className={`w-full px-4 h-auto min-h-16 max-h-48 ${STYLES.card} border-x border-t-0 border-b-0 text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-0 resize-none transition-all text-sm overflow-y-auto`}
      />

      {/* Seamless input container */}
      <div
        className={`relative h-full min-h-16 ${STYLES.card} border-t-0 rounded-b-2xl`}
      >
        {/* Bottom controls - absolutely positioned with gradient background */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center rounded-b-2xl justify-between px-4 py-3 overflow-hidden">
          {/* Left side controls */}
          <div className="flex items-center gap-2">
            {renderModelSelector()}
            {/* Modality Icons */}
            <ModalityIcons
              selectedModel={agent.model}
              onImagesChange={(images) => onUpdate({ ...agent, images })}
              onAudioRecording={(audioBlob, duration, transcription) =>
                onUpdate({
                  ...agent,
                  audioBlob,
                  audioDuration: duration,
                  audioTranscription: transcription,
                })
              }
              onWebSearch={(webSearchData) =>
                onUpdate({ ...agent, webSearchData })
              }
              images={agent.images || []}
            />
            {/* Add Agent Button */}
            {isLastAgent && canAddAgent && (
              <button
                onClick={handleAddAgent}
                className={`flex items-center justify-center px-3 py-1.5 bg-lavender-500/20 hover:bg-lavender-500/30 border border-lavender-400/30 hover:border-lavender-400/50 rounded-md text-lavender-400 hover:text-lavender-300 transition-all group backdrop-blur-sm ${
                  isAddingAgent ? "scale-95 bg-lavender-500/40" : ""
                }`}
                title="Add Agent"
              >
                <Plus
                  size={14}
                  className={`group-hover:scale-110 transition-transform ${
                    isAddingAgent ? "rotate-90 scale-110" : ""
                  }`}
                />
              </button>
            )}
          </div>

          {/* Right side controls */}
          {isLastAgent && onSendChain && (
            <button
              onClick={onSendChain}
              disabled={!canSend}
              className="flex items-center gap-2 px-3 py-1.5 bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-md font-bold transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none text-xs backdrop-blur-sm"
            >
              {isLoading ? "Running..." : "Run Chain"}

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
