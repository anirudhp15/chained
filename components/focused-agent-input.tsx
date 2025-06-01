"use client";

import { useState, useEffect } from "react";
import { type Agent } from "./agent-input";
import { ModalityIcons } from "./modality/ModalityIcons";

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

  // Initialize focused agent state when focus mode is activated
  useEffect(() => {
    if (focusedAgent) {
      setFocusedAgentState({
        ...focusedAgent,
        prompt: "", // Start with empty prompt for new input
      });
    } else {
      setFocusedAgentState(null);
    }
  }, [focusedAgent]);

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
    <div className="absolute bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          {/* Focus Mode Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-lavender-400 rounded-full"></div>
            <span className="text-sm text-gray-400">
              Focus Mode • Agent {focusedAgentIndex + 1}
            </span>
          </div>

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
              className="w-full h-32 px-4 py-4 pb-16 bg-gray-800/70 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-lavender-400/50 focus:border-lavender-400/50 resize-none transition-all text-base"
            />

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Model Display */}
                <div className="px-3 py-1.5 bg-gray-900/90 border border-gray-600/50 rounded-lg text-gray-300 text-sm backdrop-blur-sm">
                  <span className="font-medium">{focusedAgentState.model}</span>
                </div>

                {/* Modality Icons */}
                <ModalityIcons
                  selectedModel={focusedAgentState.model}
                  onImagesChange={(images) =>
                    updateFocusedAgent({ ...focusedAgentState, images })
                  }
                  onAudioRecording={(audioBlob, duration) =>
                    updateFocusedAgent({
                      ...focusedAgentState,
                      audioBlob,
                      audioDuration: duration,
                    })
                  }
                  onWebSearch={(webSearchData) =>
                    updateFocusedAgent({
                      ...focusedAgentState,
                      webSearchData,
                    })
                  }
                  images={focusedAgentState.images || []}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendFocusedAgent}
                disabled={!canSendFocused || isLoading || isStreaming}
                className="flex items-center gap-2 px-4 py-2 bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-lavender-500/25 disabled:shadow-none backdrop-blur-sm"
              >
                {isLoading || isStreaming ? "Sending..." : "Send"}
                <svg
                  width="16"
                  height="16"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
