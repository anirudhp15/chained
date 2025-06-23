"use client";

import React from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { CopyButton } from "../ui/CopyButton";

interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  children?: React.ReactNode;
  avatar?: React.ReactNode;
  copyable?: boolean;
  className?: string;
}

export function MessageBubble({
  content,
  isUser = false,
  isStreaming = false,
  streamingContent,
  children,
  avatar,
  copyable = true,
  className = "",
}: MessageBubbleProps) {
  const displayContent =
    isStreaming && streamingContent ? streamingContent : content;

  if (isUser) {
    return (
      <div
        className={`w-full justify-end flex px-0.5 group/message-bubble ${className}`}
      >
        <div className="relative w-auto max-w-[80%] bg-gray-600/25 backdrop-blur-sm rounded-lg py-2 px-3">
          <div className="text-gray-200 font-medium leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </div>
          {copyable && (
            <div className="absolute right-2 -bottom-8 opacity-0 group-hover/message-bubble:opacity-100 transition-opacity duration-200">
              <CopyButton
                text={content}
                size="sm"
                tooltipPosition="top-right"
              />
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-4 group/message-bubble ${className}`}>
      {avatar && <div className="flex-shrink-0 mt-1">{avatar}</div>}
      <div className="flex-1 pt-1">
        <div className="text-gray-200 leading-relaxed">
          {isStreaming && streamingContent ? (
            <div>
              <MarkdownRenderer content={streamingContent} />
              <div className="inline-block w-0.5 h-5 bg-emerald-400 ml-1 animate-pulse"></div>
            </div>
          ) : isStreaming && !content ? (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span>Thinking...</span>
            </div>
          ) : (
            <MarkdownRenderer content={displayContent} />
          )}
        </div>
        {copyable && !isUser && content && !isStreaming && (
          <div className="mt-2 flex justify-start opacity-0 group-hover/message-bubble:opacity-100 transition-opacity duration-200">
            <CopyButton text={content} size="sm" tooltipPosition="top-left" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
