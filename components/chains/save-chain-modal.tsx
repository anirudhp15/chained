"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Agent } from "../input/agent-input";

interface SaveChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onSaveSuccess?: () => void;
}

export function SaveChainModal({
  isOpen,
  onClose,
  agents,
  onSaveSuccess,
}: SaveChainModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSavedChain = useMutation(api.mutations.createSavedChain);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Chain name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clean up agents data for storage (remove any non-serializable data)
      const cleanedAgents = agents.map((agent) => ({
        ...agent,
        audioBlob: undefined, // Don't save audio blobs - they're not serializable
        images:
          agent.images?.map((img) => ({
            url: img.preview,
            filename: img.name,
            size: img.size,
            mimeType: img.type,
          })) || undefined,
      }));

      await createSavedChain({
        name: name.trim(),
        description: description.trim() || undefined,
        agents: cleanedAgents,
      });

      // Reset form
      setName("");
      setDescription("");

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      onClose();
    } catch (err) {
      console.error("Failed to save chain:", err);
      setError("Failed to save chain. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setDescription("");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold text-white">Save Chain</h2>
            <p className="text-sm text-gray-400 mt-1">
              Save this chain configuration for later use
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Chain Preview */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
            <div className="text-sm text-gray-300">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Models:{" "}
              {Array.from(new Set(agents.map((a) => a.model))).join(", ")}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chain Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Content Analysis Chain"
              className="w-full px-3 py-2 bg-gray-800/70 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50"
              disabled={isLoading}
              maxLength={100}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this chain does..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/70 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none"
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700/50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="px-4 py-2 bg-lavender-500 hover:bg-lavender-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isLoading ? "Saving..." : "Save Chain"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
