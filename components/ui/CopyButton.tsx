"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useCopyTracking } from "../../lib/copy-tracking-context";
import { createCopyMetadata } from "../../utils/copy-detection";
import type { SourceContext } from "../../utils/copy-detection";

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
  // Enhanced props for copy tracking
  sourceContext?: Partial<SourceContext>;
  // Tooltip positioning
  tooltipPosition?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
}

export function CopyButton({
  text,
  className = "",
  size = "sm",
  variant = "ghost",
  sourceContext,
  tooltipPosition = "top",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { trackCopy } = useCopyTracking();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Track the copy with context if provided
      if (sourceContext) {
        const metadata = createCopyMetadata(text, {
          sourceType: sourceContext.sourceType || "agent-response",
          agentIndex: sourceContext.agentIndex,
          agentName: sourceContext.agentName,
          agentModel: sourceContext.agentModel,
          sessionId: sourceContext.sessionId,
        });
        trackCopy(metadata);
      }
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const variantClasses = {
    ghost: "text-gray-400 hover:text-gray-200 hover:bg-gray-700",
    outline:
      "text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-500",
    solid: "text-white bg-gray-600 hover:bg-gray-500",
  };

  const getTooltipClasses = () => {
    const baseClasses =
      "absolute px-2 py-1 bg-gray-900 backdrop-blur-lg z-50 text-lavender-400 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap";

    switch (tooltipPosition) {
      case "top":
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case "bottom":
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case "left":
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case "right":
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      case "top-left":
        return `${baseClasses} bottom-full right-0 mb-2`;
      case "top-right":
        return `${baseClasses} bottom-full left-0 mb-2`;
      case "bottom-left":
        return `${baseClasses} top-full right-0 mt-2`;
      case "bottom-right":
        return `${baseClasses} top-full left-0 mt-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-md transition-all duration-200 relative group
        ${className}
      `}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check size={iconSizes[size]} className="text-green-400" />
      ) : (
        <Copy size={iconSizes[size]} />
      )}

      {/* Tooltip */}
      {/* <div className={getTooltipClasses()}>{copied ? "Copied!" : "Copy"}</div> */}
    </button>
  );
}
