"use client";

import { useState } from "react";
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
} from "lucide-react";
import { SiOpenai, SiClaude } from "react-icons/si";

export interface Agent {
  id: string;
  model: string;
  prompt: string;
  connection?: {
    type: "direct" | "conditional" | "parallel";
    condition?: string;
    sourceAgentId?: string;
  };
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

  switch (type) {
    case "text":
      return <MessageSquare {...iconProps} />;
    case "vision":
      return <Eye {...iconProps} />;
    case "image":
      return <Image {...iconProps} />;
    case "audio":
      return <Mic {...iconProps} />;
    case "code":
      return <Code {...iconProps} />;
    case "fast":
      return <Zap {...iconProps} />;
    case "reasoning":
      return <Brain {...iconProps} />;
    case "web":
      return <Globe {...iconProps} />;
    default:
      return null;
  }
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
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");

  const providerKey = agent.model.split("-")[0] as keyof ModelProviders;
  const selectedModel = MODEL_PROVIDERS[providerKey]?.models.find(
    (m: { value: string; label: string }) => m.value === agent.model
  );

  // Get the provider for the current model
  const currentProvider = MODEL_PROVIDERS[providerKey as keyof ModelProviders];

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

  return (
    <div className="shadow-xl space-y-3">
      {/* Header with Agent title and remove button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-lavender-400">
          Agent {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-400 transition-colors p-1 hover:bg-gray-700/50 rounded-md"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Main prompt area with absolutely positioned controls */}
      <div className="relative">
        <textarea
          value={agent.prompt}
          onChange={(e) => onUpdate({ ...agent, prompt: e.target.value })}
          placeholder="Enter your prompt..."
          className="w-full h-32 px-3 py-3 pb-14 bg-gray-700/70 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none transition-all text-sm"
        />

        {/* Bottom controls overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          {/* Left side controls */}
          <div className="flex items-center gap-2">
            {/* Model Selection */}
            <div className="relative">
              <button
                onClick={() => setIsModelOpen(!isModelOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 border border-gray-600/50 rounded-md text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 transition-all text-xs backdrop-blur-sm group"
              >
                {currentProvider && (
                  <currentProvider.icon
                    size={14}
                    className={`${currentProvider.iconColor} flex-shrink-0`}
                  />
                )}
                <span className="font-medium truncate max-w-20">
                  {selectedModel?.label || "Select Model"}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    isModelOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Model Selection Modal */}
              {isModelOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsModelOpen(false)}
                  />

                  {/* Modal */}
                  <div className="absolute bottom-full left-0 mb-2 w-96 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[80vh] flex flex-col">
                    {/* Header with Search */}
                    <div className="p-3 border-b border-gray-700/50 bg-gray-800/50">
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
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-400 text-xs focus:outline-none focus:ring-1 focus:ring-lavender-400/50"
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
                            <provider.icon
                              size={14}
                              className={provider.iconColor}
                            />
                            <span className="text-xs font-medium">
                              {provider.name}
                            </span>
                          </div>

                          {/* Models List */}
                          <div className="py-1">
                            {provider.models.map((model) => (
                              <div key={model.value} className="group">
                                <button
                                  onClick={() => {
                                    onUpdate({ ...agent, model: model.value });
                                    setIsModelOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700/50 ${
                                    agent.model === model.value
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
                                        {agent.model === model.value && (
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
                                          {/* Tooltip */}
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-60">
                                            {modality.charAt(0).toUpperCase() +
                                              modality.slice(1)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {viewMode === "detailed" &&
                                    model.capabilities && (
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
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {filteredProviders.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          No models found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Add Agent Button */}
            {isLastAgent && canAddAgent && (
              <button
                onClick={onAddAgent}
                className="flex items-center justify-center px-3 py-1.5 bg-lavender-500/20 hover:bg-lavender-500/30 border border-lavender-400/30 hover:border-lavender-400/50 rounded-md text-lavender-400 hover:text-lavender-300 transition-all group backdrop-blur-sm"
                title="Add Agent"
              >
                <Plus
                  size={14}
                  className="group-hover:scale-110 transition-transform"
                />
              </button>
            )}
          </div>

          {/* Right side controls */}
          {isLastAgent && onSendChain && (
            <button
              onClick={onSendChain}
              disabled={!canSend}
              className="flex items-center gap-2 px-3 py-1.5 bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none text-xs backdrop-blur-sm"
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
