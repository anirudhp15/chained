import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreHorizontal } from "lucide-react";
import { CopyReference } from "./CopyReference";
import type { CopyReference as CopyReferenceType } from "../../lib/copy-tracking-context";

interface ReferenceStackProps {
  references: CopyReferenceType[];
  maxVisible?: number;
  onRemove?: (id: string) => void;
  onShowAll?: () => void;
  onReferenceClick?: (reference: CopyReferenceType) => void;
  className?: string;
  showAddButton?: boolean;
  onAddReference?: () => void;
}

export function ReferenceStack({
  references,
  maxVisible = 3,
  onRemove,
  onShowAll,
  onReferenceClick,
  className = "",
  showAddButton = false,
  onAddReference,
}: ReferenceStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const visibleReferences = references.slice(0, maxVisible);
  const overflowCount = Math.max(0, references.length - maxVisible);
  const hasOverflow = overflowCount > 0;

  // Calculate the total width needed for the stack
  const stackWidth = Math.max(
    200, // Minimum width
    visibleReferences.length * 8 + 180 // Base width + stacking offset
  );

  if (references.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div
      className={`relative inline-flex items-center gap-2 reference-stack ${className}`}
    >
      {/* Reference Stack Container */}
      {references.length > 0 && (
        <div
          className="relative inline-flex items-center"
          style={{ width: stackWidth, height: 32 }}
        >
          <AnimatePresence mode="popLayout">
            {visibleReferences.map((reference, index) => (
              <motion.div
                key={reference.id}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  x: 100,
                  transition: { duration: 0.2 },
                }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: "easeOut",
                }}
                className="absolute"
                style={{
                  left: index * 8,
                  zIndex: maxVisible - index,
                }}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
              >
                <CopyReference
                  reference={reference}
                  onRemove={onRemove ? () => onRemove(reference.id) : undefined}
                  isStacked={true}
                  stackIndex={index}
                  isCompact={index > 0 && hoveredIndex !== index}
                  onClick={() => onReferenceClick?.(reference)}
                  className={`
                    transition-all duration-200 cursor-pointer
                    ${hoveredIndex === index ? "z-50" : ""}
                    ${index > 0 && hoveredIndex !== index ? "scale-95 opacity-80" : ""}
                    ${hoveredIndex === index ? "scale-105 shadow-lg" : ""}
                  `}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Overflow/More Button */}
      {hasOverflow && onShowAll && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowAll}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
            bg-gray-500/10 border border-gray-500/30 text-gray-400
            hover:bg-gray-500/20 hover:text-gray-300 hover:border-gray-500/50
            transition-all duration-200 group
          "
          title={`Show all ${references.length} references`}
        >
          <MoreHorizontal size={12} />
          <span className="font-medium">+{overflowCount} more</span>
        </motion.button>
      )}

      {/* Add Reference Button */}
      {showAddButton && onAddReference && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddReference}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
            bg-lavender-500/10 border border-lavender-500/30 text-lavender-400
            hover:bg-lavender-500/20 hover:text-lavender-300 hover:border-lavender-500/50
            transition-all duration-200 group
          "
          title="Add reference"
        >
          <Plus size={12} />
          <span className="font-medium">Add</span>
        </motion.button>
      )}

      {/* Stack Count Indicator */}
      {references.length > 1 && !hasOverflow && (
        <div
          className="
          absolute -top-1 -right-1 w-5 h-5 bg-gray-700 border border-gray-600
          rounded-full flex items-center justify-center text-xs text-gray-300
          font-medium z-10
        "
        >
          {references.length}
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
interface CompactReferenceStackProps {
  references: CopyReferenceType[];
  onShowAll?: () => void;
  className?: string;
}

export function CompactReferenceStack({
  references,
  onShowAll,
  className = "",
}: CompactReferenceStackProps) {
  if (references.length === 0) {
    return null;
  }

  const firstReference = references[0];
  const hasMore = references.length > 1;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* First reference (compact) */}
      <CopyReference
        reference={firstReference}
        isCompact={true}
        onClick={onShowAll}
        className="cursor-pointer hover:scale-105 transition-transform"
      />

      {/* Count indicator */}
      {hasMore && (
        <button
          onClick={onShowAll}
          className="
            w-6 h-6 bg-gray-700 border border-gray-600 rounded-full
            flex items-center justify-center text-xs text-gray-300
            hover:bg-gray-600 hover:text-white transition-all duration-200
          "
          title={`${references.length} references total`}
        >
          {references.length}
        </button>
      )}
    </div>
  );
}

// Animation variants for the stack
export const stackAnimationVariants = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.02,
        staggerDirection: -1,
      },
    },
  },
  item: {
    initial: {
      opacity: 0,
      scale: 0.8,
      y: 10,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  },
};
