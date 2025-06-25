import React, { useState } from "react";
import { X, FileText, MessageSquare, Code, Bot, Copy, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CopyReference } from "../../lib/copy-tracking-context";

interface CopyReferenceProps {
  reference: CopyReference;
  onRemove?: () => void;
  isCompact?: boolean;
  isStacked?: boolean;
  stackIndex?: number;
  className?: string;
  showPreview?: boolean;
  onClick?: () => void;
}

// Get icon for source type
function getSourceIcon(sourceType: CopyReference["sourceType"]) {
  switch (sourceType) {
    case "user-prompt":
      return MessageSquare;
    case "agent-response":
      return Bot;
    case "code-block":
      return Code;
    case "supervisor-response":
      return FileText;
    default:
      return FileText;
  }
}

// Get color classes for source type
function getSourceColors(sourceType: CopyReference["sourceType"]) {
  switch (sourceType) {
    case "user-prompt":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        hover: "hover:bg-blue-500/20",
        glow: "shadow-blue-500/20",
      };
    case "agent-response":
      return {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        text: "text-green-400",
        hover: "hover:bg-green-500/20",
        glow: "shadow-green-500/20",
      };
    case "code-block":
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
        hover: "hover:bg-purple-500/20",
        glow: "shadow-purple-500/20",
      };
    case "supervisor-response":
      return {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
        hover: "hover:bg-orange-500/20",
        glow: "shadow-orange-500/20",
      };
    default:
      return {
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
        text: "text-gray-400",
        hover: "hover:bg-gray-500/20",
        glow: "shadow-gray-500/20",
      };
  }
}

// Format source label
function getSourceLabel(reference: CopyReference): string {
  if (reference.agentName) {
    return reference.agentName;
  }

  if (reference.agentIndex !== undefined) {
    return `Node ${reference.agentIndex + 1}`;
  }

  switch (reference.sourceType) {
    case "user-prompt":
      return "User";
    case "agent-response":
      return "Agent";
    case "code-block":
      return "Code";
    case "supervisor-response":
      return "Supervisor";
    default:
      return "Unknown";
  }
}

export function CopyReference({
  reference,
  onRemove,
  isCompact = false,
  isStacked = false,
  stackIndex = 0,
  className = "",
  showPreview = false,
  onClick,
}: CopyReferenceProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const Icon = getSourceIcon(reference.sourceType);
  const colors = getSourceColors(reference.sourceType);
  const sourceLabel = getSourceLabel(reference);

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(reference.content);
    } catch (error) {
      console.error("Failed to copy reference content:", error);
    }
  };

  const handleTogglePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFullPreview(!showFullPreview);
  };

  // Stacking animation variants
  const stackVariants = {
    initial: {
      scale: 1 - stackIndex * 0.05,
      y: stackIndex * 2,
      opacity: 1 - stackIndex * 0.15,
      zIndex: 10 - stackIndex,
    },
    hover: {
      scale: 1,
      y: 0,
      opacity: 1,
      zIndex: 20,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      x: 100,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  };

  return (
    <motion.div
      initial={isStacked ? "initial" : undefined}
      animate={isStacked && isHovered ? "hover" : "initial"}
      exit="exit"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
        ${colors.bg} ${colors.border} border ${colors.hover}
        transition-all duration-200 group cursor-pointer
        ${isStacked ? "absolute" : ""}
        ${isHovered && isStacked ? `shadow-lg ${colors.glow}` : ""}
        ${className}
      `}
      style={
        isStacked
          ? {
              left: stackIndex * 8,
              zIndex: 10 - stackIndex,
            }
          : undefined
      }
      title={`From ${sourceLabel}: ${reference.content.slice(0, 200)}...`}
      onClick={onClick}
    >
      {/* Source icon */}
      <Icon size={12} className={colors.text} />

      {/* Source label and preview */}
      <div className="flex items-center gap-1.5 max-w-[180px]">
        <span className={`font-medium ${colors.text}`}>{sourceLabel}</span>
        {!isCompact && (
          <>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 truncate">
              {reference.truncatedPreview}
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Copy button */}
        <button
          onClick={handleCopyContent}
          className={`
            p-0.5 rounded-full transition-all duration-200
            ${colors.text} hover:bg-gray-700 hover:text-gray-200
          `}
          title="Copy content"
        >
          <Copy size={10} />
        </button>

        {/* Preview toggle button */}
        {showPreview && (
          <button
            onClick={handleTogglePreview}
            className={`
              p-0.5 rounded-full transition-all duration-200
              ${colors.text} hover:bg-gray-700 hover:text-gray-200
            `}
            title={showFullPreview ? "Hide preview" : "Show preview"}
          >
            <Eye size={10} />
          </button>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className={`
              p-0.5 rounded-full transition-all duration-200
              ${colors.text} hover:bg-red-500/20 hover:text-red-400
            `}
            title="Remove reference"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Full content preview */}
      <AnimatePresence>
        {showFullPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="
              absolute top-full left-0 mt-2 p-3 bg-gray-800 border border-gray-600
              rounded-lg shadow-xl z-50 max-w-sm w-max
            "
          >
            <div className="text-gray-300 text-sm mb-2 font-medium">
              {sourceLabel} • {reference.sourceType}
            </div>
            <div className="text-gray-400 text-xs max-h-32 overflow-y-auto">
              {reference.content}
            </div>
            <div className="text-gray-500 text-xs mt-2 pt-2 border-t border-gray-700">
              {new Date(reference.timestamp).toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
