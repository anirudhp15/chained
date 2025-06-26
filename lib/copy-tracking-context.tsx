"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  saveCopyReferences,
  loadCopyReferences,
  clearStoredReferences,
} from "./copy-storage";

// Core interfaces
export interface CopyReference {
  id: string;
  sourceType:
    | "user-prompt"
    | "agent-response"
    | "code-block"
    | "supervisor-response";
  agentIndex?: number;
  agentName?: string;
  agentModel?: string;
  content: string;
  truncatedPreview: string;
  timestamp: number;
  sessionId?: string;
}

export interface CopyMetadata {
  id: string;
  sourceType: CopyReference["sourceType"];
  agentIndex?: number;
  agentName?: string;
  agentModel?: string;
  content: string;
  timestamp: number;
  sessionId?: string;
}

export interface VisualHighlight {
  id: string;
  elementId?: string;
  content: string;
  timestamp: number;
  fadeOut: boolean;
}

interface CopyTrackingContextType {
  // References management
  references: CopyReference[];
  addReference: (metadata: CopyMetadata) => void;
  removeReference: (id: string) => void;
  clearAllReferences: () => void;
  getReference: (id: string) => CopyReference | undefined;

  // Session management
  currentSessionId: string | null;
  setSession: (sessionId: string | null) => void;
  clearSessionReferences: () => void;

  // Copy tracking
  trackCopy: (metadata: CopyMetadata) => void;
  getTrackedCopy: (content: string) => CopyMetadata | null;
  clearTrackedCopy: (id: string) => void;
  recentCopies: Map<string, CopyMetadata>;

  // Visual highlights
  highlights: VisualHighlight[];
  addHighlight: (
    highlight: Omit<VisualHighlight, "timestamp" | "fadeOut">
  ) => void;
  removeHighlight: (id: string) => void;
  clearAllHighlights: () => void;

  // Utility methods
  getVisibleReferences: () => CopyReference[];
  getOverflowCount: () => number;
  maxVisibleReferences: number;
}

const CopyTrackingContext = createContext<CopyTrackingContextType | undefined>(
  undefined
);

interface CopyTrackingProviderProps {
  children: ReactNode;
  maxVisibleReferences?: number;
}

export function CopyTrackingProvider({
  children,
  maxVisibleReferences = 3,
}: CopyTrackingProviderProps) {
  const [references, setReferences] = useState<CopyReference[]>([]);
  const [recentCopies, setRecentCopies] = useState<Map<string, CopyMetadata>>(
    new Map()
  );
  const [highlights, setHighlights] = useState<VisualHighlight[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load references from storage on mount
  useEffect(() => {
    try {
      const storedReferences = loadCopyReferences();
      setReferences(storedReferences);
    } catch (error) {
      console.error("Failed to load copy references:", error);
    }
  }, []);

  // Save references to storage when they change
  useEffect(() => {
    try {
      saveCopyReferences(references);
    } catch (error) {
      console.error("Failed to save copy references:", error);
    }
  }, [references]);

  // Filter references by current session
  const sessionReferences = useMemo(() => {
    if (!currentSessionId) return [];
    return references.filter((ref) => ref.sessionId === currentSessionId);
  }, [references, currentSessionId]);

  // Set current session and clear references from other sessions
  const setSession = useCallback(
    (sessionId: string | null) => {
      if (sessionId !== currentSessionId) {
        setCurrentSessionId(sessionId);
        // Clear recent copies when switching sessions
        setRecentCopies(new Map());
        // Clear highlights when switching sessions
        setHighlights([]);
      }
    },
    [currentSessionId]
  );

  // Clear references for current session only
  const clearSessionReferences = useCallback(() => {
    if (!currentSessionId) return;

    setReferences((current) =>
      current.filter((ref) => ref.sessionId !== currentSessionId)
    );
  }, [currentSessionId]);

  // Generate truncated preview
  const generatePreview = useCallback(
    (content: string, maxLength: number = 50): string => {
      if (content.length <= maxLength) return content;
      return content.slice(0, maxLength).trim() + "...";
    },
    []
  );

  // Track copy operations
  const trackCopy = useCallback(
    (metadata: CopyMetadata) => {
      const updatedCopies = new Map(recentCopies);
      updatedCopies.set(metadata.content, metadata);
      setRecentCopies(updatedCopies);

      // Auto-cleanup after 30 seconds
      setTimeout(() => {
        setRecentCopies((current) => {
          const updated = new Map(current);
          updated.delete(metadata.content);
          return updated;
        });
      }, 30000);
    },
    [recentCopies]
  );

  // Get tracked copy by content
  const getTrackedCopy = useCallback(
    (content: string): CopyMetadata | null => {
      // Exact match first
      const exactMatch = recentCopies.get(content);
      if (exactMatch) return exactMatch;

      // Fuzzy match for partial content
      const trimmedContent = content.trim();
      for (const [trackedContent, metadata] of recentCopies.entries()) {
        const trimmedTracked = trackedContent.trim();

        // Check if pasted content is a subset of tracked content
        if (
          trimmedTracked.includes(trimmedContent) ||
          trimmedContent.includes(trimmedTracked)
        ) {
          // Additional similarity check
          const similarity = Math.max(
            trimmedContent.length / trimmedTracked.length,
            trimmedTracked.length / trimmedContent.length
          );

          if (similarity > 0.8) {
            // 80% similarity threshold
            return metadata;
          }
        }
      }

      return null;
    },
    [recentCopies]
  );

  // Clear tracked copy
  const clearTrackedCopy = useCallback((id: string) => {
    setRecentCopies((current) => {
      const updated = new Map(current);
      for (const [content, metadata] of current.entries()) {
        if (metadata.id === id) {
          updated.delete(content);
          break;
        }
      }
      return updated;
    });
  }, []);

  // Add reference
  const addReference = useCallback(
    (metadata: CopyMetadata) => {
      const newReference: CopyReference = {
        ...metadata,
        sessionId: currentSessionId || undefined,
        truncatedPreview: generatePreview(metadata.content),
      };

      setReferences((current) => {
        // Check for duplicates within current session
        const existingIndex = current.findIndex(
          (ref) =>
            ref.content === newReference.content &&
            ref.agentIndex === newReference.agentIndex &&
            ref.sourceType === newReference.sourceType &&
            ref.sessionId === newReference.sessionId
        );

        if (existingIndex >= 0) {
          // Update existing reference timestamp
          const updated = [...current];
          updated[existingIndex] = {
            ...updated[existingIndex],
            timestamp: newReference.timestamp,
          };
          return updated;
        }

        // Add new reference at the beginning (most recent first)
        return [newReference, ...current];
      });

      // Clear from recent copies after adding as reference
      clearTrackedCopy(metadata.id);
    },
    [generatePreview, clearTrackedCopy, currentSessionId]
  );

  // Remove reference
  const removeReference = useCallback((id: string) => {
    setReferences((current) => current.filter((ref) => ref.id !== id));
  }, []);

  // Clear all references for current session
  const clearAllReferences = useCallback(() => {
    if (!currentSessionId) {
      // If no session, clear all
      setReferences([]);
    } else {
      // Clear only current session references
      clearSessionReferences();
    }
    try {
      // Note: This will clear all stored references, not just session-specific
      // Could be improved to only clear current session from storage
      if (!currentSessionId) {
        clearStoredReferences();
      }
    } catch (error) {
      console.error("Failed to clear stored references:", error);
    }
  }, [currentSessionId, clearSessionReferences]);

  // Get reference by ID (search in session references)
  const getReference = useCallback(
    (id: string): CopyReference | undefined => {
      return sessionReferences.find((ref) => ref.id === id);
    },
    [sessionReferences]
  );

  // Get visible references (for UI display)
  const getVisibleReferences = useCallback((): CopyReference[] => {
    return sessionReferences.slice(0, maxVisibleReferences);
  }, [sessionReferences, maxVisibleReferences]);

  // Get overflow count
  const getOverflowCount = useCallback((): number => {
    return Math.max(0, sessionReferences.length - maxVisibleReferences);
  }, [sessionReferences.length, maxVisibleReferences]);

  // Visual highlights management
  const addHighlight = useCallback(
    (highlight: Omit<VisualHighlight, "timestamp" | "fadeOut">) => {
      const newHighlight: VisualHighlight = {
        ...highlight,
        timestamp: Date.now(),
        fadeOut: false,
      };

      setHighlights((current) => [newHighlight, ...current]);

      // Start fade out after 3 seconds
      setTimeout(() => {
        setHighlights((current) =>
          current.map((h) =>
            h.id === newHighlight.id ? { ...h, fadeOut: true } : h
          )
        );
      }, 3000);

      // Remove after fade out animation (4 seconds total)
      setTimeout(() => {
        setHighlights((current) =>
          current.filter((h) => h.id !== newHighlight.id)
        );
      }, 4000);
    },
    []
  );

  // Remove highlight
  const removeHighlight = useCallback((id: string) => {
    setHighlights((current) => current.filter((h) => h.id !== id));
  }, []);

  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // Cleanup old highlights periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setHighlights(
        (current) => current.filter((h) => now - h.timestamp < 10000) // Keep for max 10 seconds
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // Set up global copy event listeners
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    let cleanup: (() => void) | undefined;

    const setupCopyDetection = async () => {
      try {
        const { setupGlobalCopyDetection } = await import(
          "../utils/copy-detection"
        );

        cleanup = setupGlobalCopyDetection((metadata) => {
          // Track the copy operation
          trackCopy(metadata);

          // Add visual highlight if element can be identified
          if (metadata.content) {
            addHighlight({
              id: metadata.id,
              content: metadata.content,
            });
          }
        });
      } catch (error) {
        console.error("Failed to setup copy detection:", error);
      }
    };

    // Only setup on client side
    if (typeof window !== "undefined") {
      setupCopyDetection();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [trackCopy, addHighlight]);

  const value: CopyTrackingContextType = {
    // References (session-filtered)
    references: sessionReferences,
    addReference,
    removeReference,
    clearAllReferences,
    getReference,

    // Session management
    currentSessionId,
    setSession,
    clearSessionReferences,

    // Copy tracking
    trackCopy,
    getTrackedCopy,
    clearTrackedCopy,
    recentCopies,

    // Visual highlights
    highlights,
    addHighlight,
    removeHighlight,
    clearAllHighlights,

    // Utility
    getVisibleReferences,
    getOverflowCount,
    maxVisibleReferences,
  };

  return (
    <CopyTrackingContext.Provider value={value}>
      {children}
    </CopyTrackingContext.Provider>
  );
}

export function useCopyTracking() {
  const context = useContext(CopyTrackingContext);
  if (context === undefined) {
    throw new Error(
      "useCopyTracking must be used within a CopyTrackingProvider"
    );
  }
  return context;
}

// Helper hook for just references (lighter API)
export function useCopyReferences() {
  const {
    references,
    addReference,
    removeReference,
    clearAllReferences,
    getVisibleReferences,
    getOverflowCount,
  } = useCopyTracking();

  return {
    references,
    addReference,
    removeReference,
    clearAllReferences,
    getVisibleReferences,
    getOverflowCount,
  };
}

// Helper hook for just highlights
export function useVisualHighlights() {
  const { highlights, addHighlight, removeHighlight, clearAllHighlights } =
    useCopyTracking();

  return {
    highlights,
    addHighlight,
    removeHighlight,
    clearAllHighlights,
  };
}
