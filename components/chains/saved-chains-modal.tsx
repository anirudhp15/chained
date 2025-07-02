"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Clock,
  AlertTriangle,
  Copy,
  Trash2,
  Edit3,
  Play,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Agent } from "../input/agent-input";
import type { UploadedImage } from "../modality/ImageUpload";
import type { Id } from "../../convex/_generated/dataModel";

interface SavedChainsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadChain: (agents: Agent[]) => void;
  hasCurrentChain: boolean;
}

// Type for saved chain images as stored in the database
interface SavedChainImage {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Type for saved chain agent as stored in the database
interface SavedChainAgent {
  id: string;
  model: string;
  prompt: string;
  name?: string;
  connection?: {
    type: "direct" | "conditional" | "parallel" | "collaborative";
    condition?: string;
    sourceAgentId?: string;
  };
  images?: SavedChainImage[];
  audioBlob?: Blob;
  audioDuration?: number;
  audioTranscription?: string;
  webSearchData?: any;
  webSearchEnabled?: boolean;
  grokOptions?: {
    realTimeData?: boolean;
    thinkingMode?: boolean;
  };
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

// Type for saved chain as stored in the database
interface SavedChain {
  _id: Id<"savedChains">;
  name: string;
  description?: string;
  agents: SavedChainAgent[];
  createdAt: number;
  updatedAt: number;
}

export function SavedChainsModal({
  isOpen,
  onClose,
  onLoadChain,
  hasCurrentChain,
}: SavedChainsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState<SavedChain | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const savedChainsData = useQuery(api.queries.getSavedChains, { searchQuery });
  const savedChains = (savedChainsData || []) as SavedChain[];
  const deleteSavedChain = useMutation(api.mutations.deleteSavedChain);
  const duplicateSavedChain = useMutation(api.mutations.duplicateSavedChain);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getProviderKey = (modelValue: string) => {
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
    return "openai";
  };

  const getModelDisplayName = (model: string) => {
    // Clean up model names for display
    const cleanModel = model.replace(/[_-]/g, " ");
    return cleanModel.charAt(0).toUpperCase() + cleanModel.slice(1);
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getAgentName = (agent: SavedChainAgent, index: number) => {
    return (
      agent.name ||
      (index === 0
        ? "One"
        : index === 1
          ? "Two"
          : index === 2
            ? "Three"
            : `${index + 1}`)
    );
  };

  const getConnectionTypeName = (type?: string) => {
    switch (type) {
      case "conditional":
        return "Conditional";
      case "parallel":
        return "Parallel";
      case "collaborative":
        return "Collaborative";
      default:
        return "Direct";
    }
  };

  const handleLoadChain = (chain: SavedChain) => {
    if (hasCurrentChain) {
      setSelectedChain(chain);
      setShowOverwriteWarning(true);
    } else {
      loadChainConfig(chain);
    }
  };

  const loadChainConfig = (chain: SavedChain) => {
    // Convert saved chain back to agents format
    const restoredAgents: Agent[] = chain.agents.map((agent): Agent => {
      // Convert SavedChainAgent to Agent with proper image conversion
      const convertedAgent: Agent = {
        ...agent,
        images:
          agent.images?.map(
            (img): UploadedImage => ({
              id: `restored-${Date.now()}-${Math.random()}`,
              file: new File([], img.filename, { type: img.mimeType }),
              preview: img.url,
              name: img.filename,
              size: img.size,
              type: img.mimeType,
              uploadProgress: 100,
            })
          ) || undefined,
      };
      return convertedAgent;
    });

    onLoadChain(restoredAgents);
    onClose();
    setShowOverwriteWarning(false);
    setSelectedChain(null);
  };

  const handleDelete = async (
    chainId: Id<"savedChains">,
    chainName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${chainName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(`delete-${chainId}`);
    try {
      await deleteSavedChain({ chainId });
    } catch (error) {
      console.error("Failed to delete chain:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (
    chainId: Id<"savedChains">,
    originalName: string
  ) => {
    const newName = prompt(
      `Enter a name for the duplicated chain:`,
      `${originalName} (Copy)`
    );
    if (!newName || newName.trim() === "") return;

    setActionLoading(`duplicate-${chainId}`);
    try {
      await duplicateSavedChain({ chainId, newName: newName.trim() });
    } catch (error) {
      console.error("Failed to duplicate chain:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedChain(null);
    setShowOverwriteWarning(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold text-white">Saved Chains</h2>
            <p className="text-sm text-gray-400 mt-1">
              Load a previously saved chain configuration
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chains by name, description, or model..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800/70 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50"
            />
          </div>
        </div>

        {/* Chains List */}
        <div className="flex-1 overflow-y-auto p-6">
          {savedChains.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                {searchQuery
                  ? "No chains found matching your search"
                  : "No saved chains yet"}
              </div>
              <div className="text-sm text-gray-500">
                {searchQuery
                  ? "Try a different search term"
                  : "Save your first chain to get started"}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {savedChains.map((chain) => (
                <div
                  key={chain._id}
                  className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4 hover:bg-gray-800/70 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Chain Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-white truncate">
                          {chain.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {formatDate(chain.createdAt)}
                        </div>
                      </div>

                      {/* Description */}
                      {chain.description && (
                        <p className="text-sm text-gray-400 mb-3">
                          {truncateText(chain.description)}
                        </p>
                      )}

                      {/* Chain Details */}
                      <div className="space-y-2">
                        {/* Models Summary */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">Models:</span>
                          <span className="text-gray-300">
                            {Array.from(
                              new Set(
                                chain.agents.map((a) =>
                                  getModelDisplayName(a.model)
                                )
                              )
                            ).join(", ")}
                          </span>
                          <span className="text-gray-500">
                            ({chain.agents.length} agents)
                          </span>
                        </div>

                        {/* Connection Types */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">Connections:</span>
                          <span className="text-gray-300">
                            {chain.agents
                              .slice(1)
                              .map((agent, index) =>
                                getConnectionTypeName(agent.connection?.type)
                              )
                              .filter(
                                (type, index, arr) =>
                                  arr.indexOf(type) === index
                              )
                              .join(", ") || "Direct"}
                          </span>
                        </div>

                        {/* Agent Previews */}
                        <div className="space-y-1">
                          {chain.agents.slice(0, 2).map((agent, index) => (
                            <div key={index} className="text-xs">
                              <span className="text-gray-500">
                                {getAgentName(agent, index)}:
                              </span>
                              <span className="text-gray-400 ml-1">
                                {truncateText(agent.prompt, 60)}
                              </span>
                            </div>
                          ))}
                          {chain.agents.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{chain.agents.length - 2} more agents...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadChain(chain)}
                        className="p-2 text-lavender-400 hover:text-lavender-300 hover:bg-lavender-400/10 rounded-lg transition-colors"
                        title="Load Chain"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(chain._id, chain.name)}
                        disabled={actionLoading === `duplicate-${chain._id}`}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Duplicate Chain"
                      >
                        {actionLoading === `duplicate-${chain._id}` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(chain._id, chain.name)}
                        disabled={actionLoading === `delete-${chain._id}`}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Chain"
                      >
                        {actionLoading === `delete-${chain._id}` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overwrite Warning Modal */}
      {showOverwriteWarning && selectedChain && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-amber-400" size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Replace Current Chain?
                  </h3>
                  <p className="text-sm text-gray-400">
                    Loading this saved chain will replace your current chain
                    configuration. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium text-white mb-1">
                  Loading:
                </div>
                <div className="text-sm text-gray-300">
                  {selectedChain.name}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowOverwriteWarning(false);
                    setSelectedChain(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => loadChainConfig(selectedChain)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors"
                >
                  Replace Chain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
