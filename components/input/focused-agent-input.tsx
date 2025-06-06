"use client";

import { useState, useEffect } from "react";
import { type Agent } from "./agent-input";
import { ModalityIcons } from "../modality/ModalityIcons";
import { useSidebar } from "@/lib/sidebar-context";
import { Pencil } from "lucide-react";

interface FocusedAgentInputProps {
  focusedAgentIndex: number;
  focusedAgent: Agent;
  onSendFocusedAgent: (agent: Agent) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
}

export function FocusedAgentInput({
  focusedAgentIndex,
  focusedAgent,
  onSendFocusedAgent,
  isLoading = false,
  isStreaming = false,
}: FocusedAgentInputProps) {
  const [focusedAgentState, setFocusedAgentState] = useState<Agent | null>(
    null
  );
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  // Get sidebar state for positioning
  const { sidebarWidth } = useSidebar();

  // Calculate margin for desktop centering
  const getContainerStyle = () => {
    // Only apply margin on desktop (md and up)
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      return {
        marginLeft: `${sidebarWidth}px`,
        width: `calc(100% - ${sidebarWidth}px)`,
        transition:
          "margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      };
    }
    return {};
  };

  // Initialize focused agent state when focus mode is activated
  useEffect(() => {
    if (focusedAgent) {
      const newState = {
        ...focusedAgent,
        prompt: "", // Start with empty prompt for new input
      };
      setFocusedAgentState(newState);
      setTempName(newState.name || `Node ${focusedAgentIndex + 1}`);
    } else {
      setFocusedAgentState(null);
    }
  }, [focusedAgent, focusedAgentIndex]);

  const nodeName = focusedAgentState?.name || `Node ${focusedAgentIndex + 1}`;

  const handleNameSave = () => {
    setIsNameEditing(false);
    if (tempName.trim() && focusedAgentState) {
      const updatedAgent = { ...focusedAgentState, name: tempName.trim() };
      setFocusedAgentState(updatedAgent);
    } else {
      setTempName(nodeName);
    }
  };

  const handleSendFocusedAgent = () => {
    if (
      focusedAgentState &&
      focusedAgentState.prompt.trim() !== "" &&
      onSendFocusedAgent
    ) {
      onSendFocusedAgent(focusedAgentState);
      // Clear the focused agent prompt after sending
      setFocusedAgentState({
        ...focusedAgentState,
        prompt: "",
      });
    }
  };

  const updateFocusedAgent = (updatedAgent: Agent) => {
    setFocusedAgentState(updatedAgent);
  };

  const canSendFocused = focusedAgentState?.prompt.trim() !== "";

  if (!focusedAgentState) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        ...getContainerStyle(),
      }}
    >
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-3 md:px-0">
          {/* Enhanced Input Area */}
          <div className="relative">
            <textarea
              value={focusedAgentState.prompt}
              onChange={(e) =>
                updateFocusedAgent({
                  ...focusedAgentState,
                  prompt: e.target.value,
                })
              }
              placeholder={`Continue conversation with ${focusedAgentState.model}...`}
              className="w-full h-24 rounded-xl md:h-32 px-3 md:px-4 py-3 md:py-4 pb-12 md:pb-16 bg-gray-800/70 backdrop-blur-md border border-gray-600/50 text-white placeholder-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none transition-all text-base md:text-sm"
              style={{ fontSize: "16px" }}
            />

            {/* Bottom controls */}
            <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Agent Name Editor */}
                <div className="flex items-center gap-1.5">
                  {isNameEditing ? (
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNameSave();
                        if (e.key === "Escape") {
                          setIsNameEditing(false);
                          setTempName(nodeName);
                        }
                      }}
                      className="bg-gray-700/50 border border-gray-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-lavender-400/50 min-w-16 max-w-24"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: "16px" }}
                    />
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-lavender-400/70 rounded-full flex-shrink-0"></div>
                      <span className="text-xs text-lavender-400/90 font-medium max-w-20 truncate">
                        {nodeName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsNameEditing(true);
                        }}
                        className="opacity-60 hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-700/50 rounded"
                        title="Edit name"
                      >
                        <Pencil
                          size={10}
                          className="text-gray-400 hover:text-lavender-400"
                        />
                      </button>
                    </>
                  )}
                </div>

                {/* Model Display */}
                <div className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-900/90 border border-gray-600/50 rounded-lg text-gray-300 text-xs backdrop-blur-sm">
                  <span className="font-medium">{focusedAgentState.model}</span>
                </div>

                {/* Modality Icons */}
                <ModalityIcons
                  selectedModel={focusedAgentState.model}
                  onImagesChange={(images) =>
                    updateFocusedAgent({ ...focusedAgentState, images })
                  }
                  onWebSearchToggle={(enabled) =>
                    updateFocusedAgent({
                      ...focusedAgentState,
                      webSearchEnabled: enabled,
                    })
                  }
                  isWebSearchEnabled={focusedAgentState.webSearchEnabled}
                  images={focusedAgentState.images || []}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendFocusedAgent}
                disabled={!canSendFocused || isLoading || isStreaming}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-lavender-600 hover:bg-lavender-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-lg text-xs md:text-sm font-medium transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none backdrop-blur-sm"
              >
                {isLoading || isStreaming ? "Sending..." : "Send"}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="md:w-4 md:h-4"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
