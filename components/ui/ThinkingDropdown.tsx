import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface ThinkingDropdownProps {
  thinking?: string;
  isThinking?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function ThinkingDropdown({
  thinking,
  isThinking = false,
  isStreaming = false,
  className = "",
}: ThinkingDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when thinking starts streaming
  useEffect(() => {
    if (isThinking && thinking && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isThinking, thinking, isExpanded]);

  // Don't render if there's no thinking content and not currently thinking
  if (!thinking && !isThinking) {
    return null;
  }

  return (
    <div className={`border-t border-gray-600/50 py-2 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-lavender-400/80 hover:text-lavender-400 transition-colors group"
      >
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <Brain size={12} className="text-lavender-400" />
        <span>Thinking</span>
        {isThinking && (
          <div className="flex items-center gap-1 ml-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"></div>
              <div
                className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-1 h-1 bg-lavender-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span className="text-xs text-lavender-400">processing</span>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 flex text-xs flex-col gap-2 bg-gray-900/50 rounded-lg border border-gray-600/50 animate-in slide-in-from-top-2 duration-200">
          <div className=" text-gray-400 flex items-center gap-2">
            <Brain size={10} />
            Model Thinking:
          </div>
          <div className=" text-gray-300 break-words overflow-hidden">
            {thinking ? (
              <MarkdownRenderer
                content={thinking}
                isStreaming={isThinking && isStreaming}
                className="break-words overflow-wrap-anywhere"
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="thinking-dots">
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                </div>
                <span className="text-xs">Processing thoughts...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
