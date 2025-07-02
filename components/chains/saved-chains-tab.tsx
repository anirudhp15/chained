"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Search,
  Clock,
  Copy,
  Trash2,
  Edit3,
  Loader2,
  BookOpenCheck,
} from "lucide-react";
import type { Agent } from "../input/agent-input";
import type { Id } from "../../convex/_generated/dataModel";

interface SavedChainsTabProps {
  onLoadChain?: (agents: Agent[]) => void;
}

export function SavedChainsTab({ onLoadChain }: SavedChainsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const savedChains =
    useQuery(api.queries.getSavedChains, { searchQuery }) || [];
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

  const getModelDisplayName = (model: string) => {
    const cleanModel = model.replace(/[_-]/g, " ");
    return cleanModel.charAt(0).toUpperCase() + cleanModel.slice(1);
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getAgentName = (agent: any, index: number) => {
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

  const handleLoadChain = (chain: any) => {
    if (onLoadChain) {
      // Convert saved chain back to agents format
      const restoredAgents: Agent[] = chain.agents.map((agent: any) => ({
        ...agent,
        images:
          agent.images?.map((img: any) => ({
            id: `restored-${Date.now()}-${Math.random()}`,
            file: new File([], img.filename, { type: img.mimeType }),
            preview: img.url,
            name: img.filename,
            size: img.size,
            type: img.mimeType,
            uploadProgress: 100,
          })) || undefined,
      }));

      onLoadChain(restoredAgents);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Saved Chains</h2>
          <p className="text-gray-400 mt-1">
            Manage your saved chain configurations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <BookOpenCheck size={16} />
          {savedChains.length} saved chain{savedChains.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search */}
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
          className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50"
        />
      </div>

      {/* Chains Grid */}
      {savedChains.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpenCheck className="text-gray-400" size={24} />
          </div>
          <div className="text-gray-400 mb-2 text-lg">
            {searchQuery
              ? "No chains found matching your search"
              : "No saved chains yet"}
          </div>
          <div className="text-sm text-gray-500">
            {searchQuery
              ? "Try a different search term"
              : "Create and save your first chain to get started"}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedChains.map((chain: any) => (
            <div
              key={chain._id}
              className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/50 hover:border-gray-600/50 transition-all group"
            >
              {/* Chain Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg mb-1 truncate">
                    {chain.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={14} />
                    {formatDate(chain.createdAt)}
                  </div>
                </div>
              </div>

              {/* Description */}
              {chain.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {chain.description}
                </p>
              )}

              {/* Chain Details */}
              <div className="space-y-3 mb-4">
                {/* Models Summary */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Models:</span>
                  <span className="text-gray-300 truncate">
                    {Array.from(
                      new Set(
                        chain.agents.map((a: any) =>
                          getModelDisplayName(a.model)
                        )
                      )
                    ).join(", ")}
                  </span>
                </div>

                {/* Agent Count */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Agents:</span>
                  <span className="text-gray-300">{chain.agents.length}</span>
                </div>

                {/* Connection Types */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Connections:</span>
                  <span className="text-gray-300 truncate">
                    {chain.agents
                      .slice(1)
                      .map((agent: any) =>
                        getConnectionTypeName(agent.connection?.type)
                      )
                      .filter(
                        (type: string, index: number, arr: string[]) =>
                          arr.indexOf(type) === index
                      )
                      .join(", ") || "Direct"}
                  </span>
                </div>

                {/* Agent Previews */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium">
                    Agent Prompts:
                  </div>
                  {chain.agents.slice(0, 2).map((agent: any, index: number) => (
                    <div
                      key={index}
                      className="text-xs bg-gray-800/50 rounded p-2"
                    >
                      <span className="text-gray-400 font-medium">
                        {getAgentName(agent, index)}:
                      </span>
                      <div className="text-gray-300 mt-1">
                        {truncateText(agent.prompt, 60)}
                      </div>
                    </div>
                  ))}
                  {chain.agents.length > 2 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{chain.agents.length - 2} more agent
                      {chain.agents.length - 2 !== 1 ? "s" : ""}...
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-700/30 opacity-0 group-hover:opacity-100 transition-opacity">
                {onLoadChain && (
                  <button
                    onClick={() => handleLoadChain(chain)}
                    className="flex-1 py-2 px-3 bg-lavender-500/20 hover:bg-lavender-500/30 border border-lavender-400/30 hover:border-lavender-400/50 rounded-lg text-lavender-400 hover:text-lavender-300 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    Load Chain
                  </button>
                )}
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
          ))}
        </div>
      )}
    </div>
  );
}
