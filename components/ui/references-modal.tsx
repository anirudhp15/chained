import React, { useState, useMemo, useCallback } from "react";
import {
  X,
  Search,
  Trash2,
  Copy,
  Filter,
  GripVertical,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { CopyReference } from "./CopyReference";
import type { CopyReference as CopyReferenceType } from "../../lib/copy-tracking-context";

interface ReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: CopyReferenceType[];
  onRemove?: (id: string) => void;
  onClearAll?: () => void;
  onReorder?: (newOrder: CopyReferenceType[]) => void;
  className?: string;
}

type SortOption = "recent" | "oldest" | "source-type" | "agent" | "manual";
type FilterOption =
  | "all"
  | "user-prompt"
  | "agent-response"
  | "code-block"
  | "supervisor-response";

export function ReferencesModal({
  isOpen,
  onClose,
  references,
  onRemove,
  onClearAll,
  onReorder,
  className = "",
}: ReferencesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reorderableReferences, setReorderableReferences] = useState<
    CopyReferenceType[]
  >([]);

  // Initialize reorderable references when modal opens or references change
  React.useEffect(() => {
    if (isOpen) {
      setReorderableReferences([...references]);
    }
  }, [isOpen, references]);

  // Filter and sort references
  const processedReferences = useMemo(() => {
    let filtered =
      sortBy === "manual" ? reorderableReferences : [...references];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ref) =>
          ref.content.toLowerCase().includes(query) ||
          ref.agentName?.toLowerCase().includes(query) ||
          ref.truncatedPreview.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterBy !== "all") {
      filtered = filtered.filter((ref) => ref.sourceType === filterBy);
    }

    // Apply sorting (except for manual)
    if (sortBy !== "manual") {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "recent":
            return b.timestamp - a.timestamp;
          case "oldest":
            return a.timestamp - b.timestamp;
          case "source-type":
            return a.sourceType.localeCompare(b.sourceType);
          case "agent":
            const aAgent = a.agentName || `Node ${(a.agentIndex ?? 0) + 1}`;
            const bAgent = b.agentName || `Node ${(b.agentIndex ?? 0) + 1}`;
            return aAgent.localeCompare(bAgent);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [references, reorderableReferences, searchQuery, sortBy, filterBy]);

  // Get type counts for filter options
  const typeCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: references.length,
      "user-prompt": 0,
      "agent-response": 0,
      "code-block": 0,
      "supervisor-response": 0,
    };

    references.forEach((ref) => {
      counts[ref.sourceType as FilterOption]++;
    });

    return counts;
  }, [references]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(processedReferences.map((ref) => ref.id)));
  }, [processedReferences]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk actions
  const removeSelected = useCallback(() => {
    if (onRemove) {
      selectedIds.forEach((id) => onRemove(id));
    }
    clearSelection();
  }, [selectedIds, onRemove, clearSelection]);

  const exportSelected = useCallback(() => {
    const selectedRefs = processedReferences.filter((ref) =>
      selectedIds.has(ref.id)
    );
    const exportData = {
      exportDate: new Date().toISOString(),
      references: selectedRefs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copy-references-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedReferences, selectedIds]);

  // Reorder handler
  const handleReorder = useCallback(
    (newOrder: CopyReferenceType[]) => {
      setReorderableReferences(newOrder);
      if (onReorder) {
        onReorder(newOrder);
      }
    },
    [onReorder]
  );

  if (!isOpen) return null;

  const isManualSort = sortBy === "manual";
  const hasSelection = selectedIds.size > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`
          bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
          w-full max-w-5xl max-h-[85vh] flex flex-col
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              Copy References
            </h2>
            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
              {references.length} total
            </span>
            {hasSelection && (
              <span className="px-2 py-1 bg-lavender-600 text-white text-xs rounded-full">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk actions */}
            {hasSelection && (
              <>
                <button
                  onClick={exportSelected}
                  className="
                    px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300
                    hover:bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50
                    rounded-lg transition-all duration-200
                  "
                  title="Export selected references"
                >
                  <Download size={14} className="inline mr-1" />
                  Export
                </button>
                <button
                  onClick={removeSelected}
                  className="
                    px-3 py-1.5 text-sm text-red-400 hover:text-red-300
                    hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50
                    rounded-lg transition-all duration-200
                  "
                  title="Remove selected references"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Remove
                </button>
              </>
            )}

            {/* Clear all button */}
            {onClearAll && references.length > 0 && (
              <button
                onClick={() => {
                  onClearAll();
                  onClose();
                }}
                className="
                  px-3 py-1.5 text-sm text-red-400 hover:text-red-300
                  hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50
                  rounded-lg transition-all duration-200
                "
                title="Clear all references"
              >
                <Trash2 size={14} className="inline mr-1" />
                Clear All
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600
                text-white placeholder-gray-400 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-lavender-500
                transition-all duration-200
              "
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  className="
                    bg-gray-800 border border-gray-600 text-white text-sm rounded-lg
                    px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lavender-500
                  "
                >
                  <option value="all">All Types ({typeCounts.all})</option>
                  <option value="user-prompt">
                    User Prompts ({typeCounts["user-prompt"]})
                  </option>
                  <option value="agent-response">
                    Agent Responses ({typeCounts["agent-response"]})
                  </option>
                  <option value="code-block">
                    Code Blocks ({typeCounts["code-block"]})
                  </option>
                  <option value="supervisor-response">
                    Supervisor ({typeCounts["supervisor-response"]})
                  </option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="
                    bg-gray-800 border border-gray-600 text-white text-sm rounded-lg
                    px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lavender-500
                  "
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="source-type">By Type</option>
                  <option value="agent">By Agent</option>
                  <option value="manual">Manual Order</option>
                </select>
              </div>
            </div>

            {/* Selection controls */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={selectAll}
                className="text-lavender-400 hover:text-lavender-300 transition-colors"
              >
                Select All
              </button>
              <span className="text-gray-500">•</span>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* References List */}
        <div className="flex-1 overflow-y-auto p-4">
          {processedReferences.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                {searchQuery || filterBy !== "all"
                  ? "No references match your criteria"
                  : "No references yet"}
              </div>
              <div className="text-gray-500 text-sm">
                {searchQuery || filterBy !== "all"
                  ? "Try adjusting your search or filters"
                  : "Copy text from chat responses to create references"}
              </div>
            </div>
          ) : isManualSort ? (
            // Reorderable list
            <Reorder.Group
              axis="y"
              values={processedReferences}
              onReorder={handleReorder}
              className="space-y-3"
            >
              <AnimatePresence>
                {processedReferences.map((reference) => (
                  <Reorder.Item
                    key={reference.id}
                    value={reference}
                    dragListener={false}
                    className="
                      group bg-gray-800/50 border border-gray-700 rounded-lg p-4
                      hover:bg-gray-800/80 hover:border-gray-600 transition-all duration-200
                      cursor-pointer
                    "
                    whileDrag={{
                      scale: 1.02,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag handle */}
                      <Reorder.Item
                        value={reference}
                        dragListener={true}
                        className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical size={16} />
                      </Reorder.Item>

                      {/* Selection checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(reference.id)}
                        onChange={() => toggleSelection(reference.id)}
                        className="mt-1 rounded border-gray-600 bg-gray-700 text-lavender-500 focus:ring-lavender-500"
                      />

                      {/* Reference chip */}
                      <div className="flex-shrink-0">
                        <CopyReference
                          reference={reference}
                          onRemove={
                            onRemove ? () => onRemove(reference.id) : undefined
                          }
                        />
                      </div>

                      {/* Content preview */}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-300 text-sm mb-2 line-clamp-3">
                          {reference.content}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {new Date(reference.timestamp).toLocaleString()}
                          </span>
                          {reference.agentModel && (
                            <span>Model: {reference.agentModel}</span>
                          )}
                          {reference.sessionId && (
                            <span>
                              Session: {reference.sessionId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(reference.content)
                          }
                          className="
                            p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700
                            rounded transition-all duration-200
                          "
                          title="Copy content"
                        >
                          <Copy size={14} />
                        </button>
                        {onRemove && (
                          <button
                            onClick={() => onRemove(reference.id)}
                            className="
                              p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10
                              rounded transition-all duration-200
                            "
                            title="Remove reference"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            // Regular list
            <div className="space-y-3">
              {processedReferences.map((reference) => (
                <motion.div
                  key={reference.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="
                    group bg-gray-800/50 border border-gray-700 rounded-lg p-4
                    hover:bg-gray-800/80 hover:border-gray-600 transition-all duration-200
                  "
                >
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(reference.id)}
                      onChange={() => toggleSelection(reference.id)}
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-lavender-500 focus:ring-lavender-500"
                    />

                    {/* Reference chip */}
                    <div className="flex-shrink-0">
                      <CopyReference
                        reference={reference}
                        onRemove={
                          onRemove ? () => onRemove(reference.id) : undefined
                        }
                      />
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-300 text-sm mb-2 line-clamp-3">
                        {reference.content}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {new Date(reference.timestamp).toLocaleString()}
                        </span>
                        {reference.agentModel && (
                          <span>Model: {reference.agentModel}</span>
                        )}
                        {reference.sessionId && (
                          <span>
                            Session: {reference.sessionId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(reference.content)
                        }
                        className="
                          p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700
                          rounded transition-all duration-200
                        "
                        title="Copy content"
                      >
                        <Copy size={14} />
                      </button>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(reference.id)}
                          className="
                            p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10
                            rounded transition-all duration-200
                          "
                          title="Remove reference"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {processedReferences.length > 0 && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div>
                Showing {processedReferences.length} of {references.length}{" "}
                references
              </div>
              {hasSelection && <div>{selectedIds.size} selected</div>}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
