import React, { useState } from "react";
import {
  X,
  FileText,
  MessageSquare,
  Code,
  Bot,
  Copy,
  Eye,
  User,
  Zap,
  Sparkles,
  Brain,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CopyReference } from "../../lib/copy-tracking-context";
import { SiOpenai, SiClaude } from "react-icons/si";

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

// Grok Icon Component (copied from agent-input.tsx)
const GrokIcon = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 24 24"
    className={className}
  >
    <path d="m19.25 5.08-9.52 9.67 6.64-4.96c.33-.24.79-.15.95.23.82 1.99.45 4.39-1.17 6.03-1.63 1.64-3.89 2.01-5.96 1.18l-2.26 1.06c3.24 2.24 7.18 1.69 9.64-.8 1.95-1.97 2.56-4.66 1.99-7.09-.82-3.56.2-4.98 2.29-7.89L22 2.3zM9.72 14.75h.01zM8.35 15.96c-2.33-2.25-1.92-5.72.06-7.73 1.47-1.48 3.87-2.09 5.97-1.2l2.25-1.05c-.41-.3-.93-.62-1.52-.84a7.45 7.45 0 0 0-8.13 1.65c-2.11 2.14-2.78 5.42-1.63 8.22.85 2.09-.54 3.57-1.95 5.07-.5.53-1 1.06-1.4 1.62z" />
  </svg>
);

// Get icon for LLM provider based on model name
function getProviderIcon(model?: string) {
  if (!model) return Bot;

  const modelLower = model.toLowerCase();

  if (
    modelLower.includes("gpt") ||
    modelLower.includes("openai") ||
    modelLower.includes("o1") ||
    modelLower.includes("o3") ||
    modelLower.includes("o4")
  ) {
    return SiOpenai;
  }
  if (modelLower.includes("claude") || modelLower.includes("anthropic")) {
    return SiClaude;
  }
  if (modelLower.includes("grok") || modelLower.includes("x.ai")) {
    return GrokIcon;
  }

  return Bot; // Default
}

// Get icon for source type with LLM provider support
function getSourceIcon(reference: CopyReference) {
  switch (reference.sourceType) {
    case "user-prompt":
      return User;
    case "agent-response":
      return getProviderIcon(reference.agentModel);
    case "code-block":
      return Code;
    case "supervisor-response":
      return FileText;
    default:
      return Bot;
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

// Format source label with model information
function getSourceLabel(reference: CopyReference): string {
  if (reference.sourceType === "user-prompt") {
    return "You";
  }

  // For agent responses, prioritize agent name or show model info
  if (reference.sourceType === "agent-response") {
    if (reference.agentName) {
      return reference.agentName;
    }

    if (reference.agentModel) {
      // Extract readable model name
      const model = reference.agentModel.toLowerCase();
      if (model.includes("gpt-4")) return "GPT-4";
      if (model.includes("gpt-3.5")) return "GPT-3.5";
      if (model.includes("claude-3-sonnet")) return "Claude 3 Sonnet";
      if (model.includes("claude-3-haiku")) return "Claude 3 Haiku";
      if (model.includes("claude-3-opus")) return "Claude 3 Opus";
      if (model.includes("claude")) return "Claude";
      if (model.includes("gemini")) return "Gemini";
      if (model.includes("llama")) return "Llama";
      if (model.includes("grok")) return "Grok";

      // Fallback to model name
      return reference.agentModel;
    }

    if (reference.agentIndex !== undefined) {
      return `LLM ${reference.agentIndex + 1}`;
    }
  }

  switch (reference.sourceType) {
    case "code-block":
      return "Code";
    case "supervisor-response":
      return "Supervisor";
    default:
      return "Agent";
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

  const Icon = getSourceIcon(reference);
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

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove();
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
        relative inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs
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
      {/* Source icon that transforms to X on hover */}
      <motion.button
        onClick={onRemove ? handleRemove : undefined}
        className={`
          flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200
          ${onRemove ? "cursor-pointer" : "cursor-default"}
          ${onRemove && isHovered ? "bg-red-500/20 hover:bg-red-500/30" : ""}
        `}
        title={
          onRemove && isHovered
            ? "Remove reference"
            : `${sourceLabel} (${reference.sourceType})`
        }
        disabled={!onRemove}
      >
        <AnimatePresence mode="wait">
          {onRemove && isHovered ? (
            <motion.div
              key="remove"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <X size={12} className="text-red-400" />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <Icon size={12} className={colors.text} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Source label and preview */}
      <div className="flex items-center gap-1 max-w-[180px]">
        <span className={`font-medium whitespace-nowrap ${colors.text}`}>
          {sourceLabel}
        </span>
      </div>

      {/* Action buttons - only copy and preview */}
      <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
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
            <div className="text-gray-300 text-sm mb-2 font-medium flex items-center gap-2">
              <Icon size={14} className={colors.text} />
              {sourceLabel} • {reference.sourceType}
              {reference.agentModel && (
                <span className="text-gray-500 text-xs">
                  ({reference.agentModel})
                </span>
              )}
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
