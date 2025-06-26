import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreHorizontal, Layers3, ChevronDown } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleReferences = references.slice(0, maxVisible);
  const overflowCount = Math.max(0, references.length - maxVisible);
  const hasOverflow = overflowCount > 0;

  if (references.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className={`inline-flex items-start gap-2 ${className}`}>
      {/* Main Stack Container */}
      {references.length > 0 && (
        <div className="relative group">
          {/* Stacked Cards Background Effect */}
          <div className="relative">
            {/* Background stacking shadows for depth */}
            {/* {visibleReferences.length > 1 && (
              <>
                {visibleReferences.length > 2 && (
                  <div className="absolute top-1.5 left-1.5 w-full h-full bg-gray-700/20 rounded-full" />
                )}
                <div className="absolute top-0.5 left-0.5 w-full h-full bg-gray-600/30 rounded-full" />
              </>
            )} */}

            {/* Primary Reference Card - Clean, no extra borders */}
            <motion.div
              layout
              className="relative"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <CopyReference
                reference={visibleReferences[0]}
                onRemove={
                  onRemove ? () => onRemove(visibleReferences[0].id) : undefined
                }
                onClick={() => onReferenceClick?.(visibleReferences[0])}
                className="cursor-pointer"
              />
            </motion.div>

            {/* Stack Count Badge - Better positioned */}
            {references.length > 1 && (
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-2 -right-4 flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full shadow-lg z-10"
              >
                <Layers3 size={8} />
                <span className="text-xs font-bold">{references.length}</span>
              </motion.button>
            )}
          </div>

          {/* Expanded View - Better mobile positioning */}
          <AnimatePresence>
            {isExpanded && visibleReferences.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="
                  absolute bottom-full left-0 mb-3 z-50 
                  bg-gray-800/95 backdrop-blur-sm 
                  border border-gray-600/50 rounded-lg 
                   min-w-full max-w-xs md:max-w-sm
                  shadow-xl
                "
              >
                <h3 className="text-xs whitespace-nowrap font-medium text-gray-300 py-2 px-4 bg-gray-700/50">
                  Chain References
                </h3>
                <div className="flex flex-col gap-1 p-2">
                  {visibleReferences.map((reference, index) => (
                    <motion.div
                      key={reference.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CopyReference
                        reference={reference}
                        onRemove={
                          onRemove ? () => onRemove(reference.id) : undefined
                        }
                        onClick={() => onReferenceClick?.(reference)}
                        isCompact={true}
                        className="cursor-pointer hover:bg-gray-700/50 rounded p-1 transition-colors"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {references.length === 0 && (
        <div className="text-gray-300 text-xs">No references</div>
      )}

      {/* Overflow/More Button - Improved mobile styling */}
      {hasOverflow && onShowAll && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowAll}
          className="
            inline-flex items-center gap-1.5 
            px-2.5 py-1.5 md:px-3 md:py-2 
            rounded-lg text-xs
            bg-gray-700/50 border border-gray-600/50 text-gray-300
            hover:bg-gray-600/60 hover:text-white hover:border-gray-500/70
            transition-all duration-200 shadow-lg
            touch-manipulation
          "
          title={`Show all ${references.length} references`}
        >
          <MoreHorizontal size={10} className="md:w-3 md:h-3" />
          <span className="font-medium text-xs">+{overflowCount}</span>
        </motion.button>
      )}

      {/* Add Reference Button - Mobile-optimized */}
      {showAddButton && onAddReference && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddReference}
          className="
            inline-flex items-center gap-1.5 
            px-2.5 py-1.5 md:px-3 md:py-2 
            rounded-lg text-xs
            bg-blue-500/10 border border-blue-500/30 text-blue-400
            hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50
            transition-all duration-200 shadow-lg
            touch-manipulation
          "
          title="Add reference"
        >
          <Plus size={10} className="md:w-3 md:h-3" />
          <span className="font-medium text-xs">Add</span>
        </motion.button>
      )}
    </div>
  );
}

// Simplified Compact Version - Mobile improvements
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
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative group">
        {/* Background stacking effect for multiple references */}
        {hasMore && (
          <>
            <div className="absolute top-0.5 left-0.5 w-full h-full bg-gray-700/30 rounded-md" />
            <div className="absolute top-1 left-1 w-full h-full bg-gray-800/20 rounded-md" />
          </>
        )}

        {/* Main compact reference - Clean styling */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="relative"
        >
          <CopyReference
            reference={firstReference}
            isCompact={true}
            onClick={onShowAll}
            className="cursor-pointer touch-manipulation"
          />
        </motion.div>

        {/* Count badge - Mobile-friendly sizing */}
        {hasMore && (
          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs leading-none">{references.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Clean animation variants
export const stackAnimationVariants = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  },
  item: {
    initial: {
      opacity: 0,
      scale: 0.9,
      y: 20,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  },
};
