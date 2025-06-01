"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import type { Id } from "../convex/_generated/dataModel";

interface AgentStep {
  _id: Id<"agentSteps">;
  index: number;
  name?: string;
  model: string;
  response?: string;
  isComplete: boolean;
}

interface SupervisorChatInputProps {
  sessionId: string;
  agentSteps: AgentStep[];
  onSupervisorSend: (prompt: string) => void;
  onSupervisorTyping?: (isTyping: boolean) => void;
  isLoading?: boolean;
}

interface AgentOption {
  index: number;
  name: string;
  model: string;
}

export function SupervisorChatInput({
  sessionId,
  agentSteps,
  onSupervisorSend,
  onSupervisorTyping,
  isLoading = false,
}: SupervisorChatInputProps) {
  const [prompt, setPrompt] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  const [filteredAgents, setFilteredAgents] = useState<AgentOption[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Available agents for @mention autocomplete
  const availableAgents: AgentOption[] = agentSteps.map((step, index) => ({
    index,
    name: step.name || `Agent ${index + 1}`,
    model: step.model,
  }));

  // @mention autocomplete logic
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setPrompt(value);

    // Handle typing indicator
    if (onSupervisorTyping) {
      onSupervisorTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onSupervisorTyping(false);
      }, 1000);
    }

    // Detect @ character for autocomplete
    const beforeCursor = value.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const searchTerm = atMatch[1].toLowerCase();
      setLastAtPosition(atMatch.index!);

      // Filter agents based on search term
      const filtered = availableAgents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchTerm) ||
          agent.model.toLowerCase().includes(searchTerm) ||
          `agent${agent.index + 1}`.includes(searchTerm)
      );

      setFilteredAgents(filtered);
      setShowAgentDropdown(true);
    } else {
      setShowAgentDropdown(false);
    }
  };

  // Handle agent selection from dropdown
  const handleAgentSelect = (agent: AgentOption) => {
    if (textareaRef.current && lastAtPosition >= 0) {
      const beforeAt = prompt.substring(0, lastAtPosition);
      const afterCursor = prompt.substring(textareaRef.current.selectionStart);
      const newValue = `${beforeAt}@${agent.name} ${afterCursor}`;

      setPrompt(newValue);
      setShowAgentDropdown(false);

      // Focus back to textarea and position cursor
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeAt.length + agent.name.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAgentDropdown && filteredAgents.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        // TODO: Implement keyboard navigation
      } else if (e.key === "Enter" && filteredAgents.length === 1) {
        e.preventDefault();
        handleAgentSelect(filteredAgents[0]);
      } else if (e.key === "Escape") {
        setShowAgentDropdown(false);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    if (prompt.trim() && !isLoading) {
      // Stop typing indicator when sending
      if (onSupervisorTyping) {
        onSupervisorTyping(false);
      }

      onSupervisorSend(prompt.trim());
      setPrompt("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showAgentDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 pb-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          {/* Input Area with Autocomplete */}
          <div className="relative bg-gray-700/75 backdrop-blur-sm border hover:bg-gray-700/80 border-gray-600/50 rounded-xl ">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to coordinate your agents: '@Agent1 analyze this data, @Agent2 summarize the findings'"
              className="w-full h-32 px-4 py-4 pb-16 border-none outline-none ring-0 text-sm bg-transparent rounded-xl text-white placeholder-gray-400 focus:outline-none  resize-none transition-all "
            />

            {/* @mention autocomplete dropdown */}
            {showAgentDropdown && filteredAgents.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute bottom-full left-0 mb-2 w-min bg-gray-900/90 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.index}
                    onClick={() => handleAgentSelect(agent)}
                    className="w-full px-4 py-3 text-xs text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors border-b border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-white whitespace-nowrap font-medium">
                        {agent.name}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap">
                        {agent.model}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Agent Count Display */}
                <div className="px-3 py-1.5 bg-gray-900/90 border border-gray-600/50 rounded-lg text-gray-300 text-xs backdrop-blur-sm">
                  <span className="font-medium">
                    {agentSteps.length} agent
                    {agentSteps.length !== 1 ? "s" : ""} available
                  </span>
                </div>

                {/* Hint Text */}
                <div className="text-xs text-gray-500">
                  Type @ to mention agents
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-emerald-500/25 disabled:shadow-none backdrop-blur-sm"
              >
                {isLoading ? "Coordinating..." : "Send"}
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
