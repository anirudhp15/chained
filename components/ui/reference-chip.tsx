import React from "react";
import { X, FileText, MessageSquare, Code, Bot } from "lucide-react";
import type { CopyReference } from "../../lib/copy-tracking-context";

interface ReferenceChipProps {
  reference: CopyReference;
  onRemove?: () => void;
  isCompact?: boolean;
  className?: string;
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
      };
    case "agent-response":
      return {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        text: "text-green-400",
        hover: "hover:bg-green-500/20",
      };
    case "code-block":
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
        hover: "hover:bg-purple-500/20",
      };
    case "supervisor-response":
      return {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
        hover: "hover:bg-orange-500/20",
      };
    default:
      return {
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
        text: "text-gray-400",
        hover: "hover:bg-gray-500/20",
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

export function ReferenceChip({
  reference,
  onRemove,
  isCompact = false,
  className = "",
}: ReferenceChipProps) {
  const Icon = getSourceIcon(reference.sourceType);
  const colors = getSourceColors(reference.sourceType);
  const sourceLabel = getSourceLabel(reference);

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
        ${colors.bg} ${colors.border} border ${colors.hover}
        transition-all duration-200 group relative
        ${className}
      `}
      title={`From ${sourceLabel}: ${reference.content.slice(0, 200)}...`}
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
            opacity-0 group-hover:opacity-100
            ${colors.text} hover:bg-red-500/20 hover:text-red-400
          `}
          title="Remove reference"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// Stacked reference chips (for showing 1-3 with overflow)
interface StackedReferenceChipsProps {
  references: CopyReference[];
  maxVisible?: number;
  onRemove?: (id: string) => void;
  onShowAll?: () => void;
  className?: string;
}

export function StackedReferenceChips({
  references,
  maxVisible = 3,
  onRemove,
  onShowAll,
  className = "",
}: StackedReferenceChipsProps) {
  const visibleReferences = references.slice(0, maxVisible);
  const overflowCount = Math.max(0, references.length - maxVisible);

  if (references.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Stacked chips with z-index for layering effect */}
      <div className="relative flex items-center">
        {visibleReferences.map((reference, index) => (
          <div
            key={reference.id}
            className="relative"
            style={{
              zIndex: maxVisible - index,
              marginLeft: index > 0 ? "-8px" : "0",
            }}
          >
            <ReferenceChip
              reference={reference}
              onRemove={onRemove ? () => onRemove(reference.id) : undefined}
              isCompact={index > 0} // Only show full info for the first chip
              className={`
                ${index > 0 ? "scale-95 opacity-80" : ""}
                shadow-lg
              `}
            />
          </div>
        ))}
      </div>

      {/* Overflow button */}
      {overflowCount > 0 && onShowAll && (
        <button
          onClick={onShowAll}
          className="
            px-2 py-1 rounded-full text-xs
            bg-gray-500/10 border border-gray-500/30 text-gray-400
            hover:bg-gray-500/20 hover:text-gray-300
            transition-all duration-200
          "
          title={`Show all ${references.length} references`}
        >
          +{overflowCount} more
        </button>
      )}
    </div>
  );
}
