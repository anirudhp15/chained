// Visual highlight tracking utilities
// This module handles the visual feedback for recently copied text

// Generate unique IDs for highlights
export function generateHighlightId(): string {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate content-based hash for consistent highlighting
export function generateContentHash(content: string): string {
  // Simple hash function for consistent IDs based on content
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `content-${Math.abs(hash).toString(36)}`;
}

// Highlight duration constants
export const HIGHLIGHT_DURATIONS = {
  FADE_START: 3000, // When to start fading (3 seconds)
  FADE_COMPLETE: 4000, // When to remove completely (4 seconds)
  MAX_LIFETIME: 10000, // Maximum highlight lifetime (10 seconds)
} as const;

// CSS class names for highlighting
export const HIGHLIGHT_CLASSES = {
  BASE: "copy-highlight",
  ACTIVE: "copy-highlight-active",
  FADING: "copy-highlight-fading",
  CONTAINER: "copy-highlight-container",
} as const;

// Highlight types
export type HighlightType = "copy" | "paste" | "selection";

// Enhanced highlight interface for tracking
export interface HighlightInfo {
  id: string;
  contentHash: string;
  content: string;
  type: HighlightType;
  elementId?: string;
  startTime: number;
  fadeStartTime: number;
  endTime: number;
  isActive: boolean;
  isFading: boolean;
}

// Global highlight manager class
class HighlightManager {
  private highlights = new Map<string, HighlightInfo>();
  private timers = new Map<
    string,
    { fadeTimer: NodeJS.Timeout; removeTimer: NodeJS.Timeout }
  >();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Add a new highlight
  addHighlight(
    content: string,
    type: HighlightType = "copy",
    elementId?: string
  ): HighlightInfo {
    const id = generateHighlightId();
    const contentHash = generateContentHash(content);
    const now = Date.now();

    // Remove any existing highlight for the same content
    this.removeHighlightByContent(content);

    const highlight: HighlightInfo = {
      id,
      contentHash,
      content,
      type,
      elementId,
      startTime: now,
      fadeStartTime: now + HIGHLIGHT_DURATIONS.FADE_START,
      endTime: now + HIGHLIGHT_DURATIONS.FADE_COMPLETE,
      isActive: true,
      isFading: false,
    };

    this.highlights.set(id, highlight);

    // Set up fade and remove timers
    const fadeTimer = setTimeout(() => {
      this.startFading(id);
    }, HIGHLIGHT_DURATIONS.FADE_START);

    const removeTimer = setTimeout(() => {
      this.removeHighlight(id);
    }, HIGHLIGHT_DURATIONS.FADE_COMPLETE);

    this.timers.set(id, { fadeTimer, removeTimer });

    return highlight;
  }

  // Start fading animation for a highlight
  private startFading(id: string): void {
    const highlight = this.highlights.get(id);
    if (highlight) {
      highlight.isFading = true;
      this.highlights.set(id, highlight);
    }
  }

  // Remove a highlight by ID
  removeHighlight(id: string): boolean {
    const highlight = this.highlights.get(id);
    if (!highlight) return false;

    // Clear timers
    const timers = this.timers.get(id);
    if (timers) {
      clearTimeout(timers.fadeTimer);
      clearTimeout(timers.removeTimer);
      this.timers.delete(id);
    }

    // Remove highlight
    this.highlights.delete(id);
    return true;
  }

  // Remove highlight by content
  removeHighlightByContent(content: string): boolean {
    const contentHash = generateContentHash(content);
    let removed = false;

    for (const [id, highlight] of this.highlights.entries()) {
      if (highlight.contentHash === contentHash) {
        this.removeHighlight(id);
        removed = true;
      }
    }

    return removed;
  }

  // Get highlight by ID
  getHighlight(id: string): HighlightInfo | undefined {
    return this.highlights.get(id);
  }

  // Get all active highlights
  getAllHighlights(): HighlightInfo[] {
    return Array.from(this.highlights.values());
  }

  // Get highlights by type
  getHighlightsByType(type: HighlightType): HighlightInfo[] {
    return Array.from(this.highlights.values()).filter((h) => h.type === type);
  }

  // Get highlights for specific content
  getHighlightsForContent(content: string): HighlightInfo[] {
    const contentHash = generateContentHash(content);
    return Array.from(this.highlights.values()).filter(
      (h) => h.contentHash === contentHash
    );
  }

  // Check if content is currently highlighted
  isContentHighlighted(content: string): boolean {
    const contentHash = generateContentHash(content);
    return Array.from(this.highlights.values()).some(
      (h) => h.contentHash === contentHash
    );
  }

  // Clear all highlights
  clearAllHighlights(): void {
    // Clear all timers
    for (const timers of this.timers.values()) {
      clearTimeout(timers.fadeTimer);
      clearTimeout(timers.removeTimer);
    }

    this.timers.clear();
    this.highlights.clear();
  }

  // Get highlight statistics
  getStats(): {
    total: number;
    active: number;
    fading: number;
    byType: Record<HighlightType, number>;
  } {
    const highlights = Array.from(this.highlights.values());
    const byType: Record<HighlightType, number> = {
      copy: 0,
      paste: 0,
      selection: 0,
    };

    highlights.forEach((h) => {
      byType[h.type]++;
    });

    return {
      total: highlights.length,
      active: highlights.filter((h) => h.isActive && !h.isFading).length,
      fading: highlights.filter((h) => h.isFading).length,
      byType,
    };
  }

  // Start periodic cleanup of expired highlights
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredHighlights();
    }, 5000); // Cleanup every 5 seconds
  }

  // Clean up expired highlights
  private cleanupExpiredHighlights(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, highlight] of this.highlights.entries()) {
      if (now > highlight.endTime + 1000) {
        // 1 second grace period
        expiredIds.push(id);
      }
    }

    expiredIds.forEach((id) => this.removeHighlight(id));
  }

  // Cleanup on destroy
  destroy(): void {
    this.clearAllHighlights();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global instance
let globalHighlightManager: HighlightManager | null = null;

// Get global highlight manager instance
export function getHighlightManager(): HighlightManager {
  if (!globalHighlightManager) {
    globalHighlightManager = new HighlightManager();
  }
  return globalHighlightManager;
}

// Convenience functions that use the global manager
export function addHighlight(
  content: string,
  type: HighlightType = "copy",
  elementId?: string
): HighlightInfo {
  return getHighlightManager().addHighlight(content, type, elementId);
}

export function removeHighlight(id: string): boolean {
  return getHighlightManager().removeHighlight(id);
}

export function removeHighlightByContent(content: string): boolean {
  return getHighlightManager().removeHighlightByContent(content);
}

export function getHighlight(id: string): HighlightInfo | undefined {
  return getHighlightManager().getHighlight(id);
}

export function getAllHighlights(): HighlightInfo[] {
  return getHighlightManager().getAllHighlights();
}

export function getHighlightsByType(type: HighlightType): HighlightInfo[] {
  return getHighlightManager().getHighlightsByType(type);
}

export function getHighlightsForContent(content: string): HighlightInfo[] {
  return getHighlightManager().getHighlightsForContent(content);
}

export function isContentHighlighted(content: string): boolean {
  return getHighlightManager().isContentHighlighted(content);
}

export function clearAllHighlights(): void {
  getHighlightManager().clearAllHighlights();
}

export function getHighlightStats(): {
  total: number;
  active: number;
  fading: number;
  byType: Record<HighlightType, number>;
} {
  return getHighlightManager().getStats();
}

// CSS utilities for highlighting
export function getHighlightCssClasses(highlight: HighlightInfo): string {
  const classes: string[] = [HIGHLIGHT_CLASSES.BASE];

  if (highlight.isActive && !highlight.isFading) {
    classes.push(HIGHLIGHT_CLASSES.ACTIVE);
  }

  if (highlight.isFading) {
    classes.push(HIGHLIGHT_CLASSES.FADING);
  }

  return classes.join(" ");
}

// DOM utilities for applying highlights
export function applyHighlightToElement(
  element: HTMLElement,
  highlight: HighlightInfo
): void {
  if (!element) return;

  const cssClasses = getHighlightCssClasses(highlight);
  element.className = `${element.className} ${cssClasses}`.trim();
  element.setAttribute("data-highlight-id", highlight.id);
  element.setAttribute("data-highlight-type", highlight.type);
}

export function removeHighlightFromElement(element: HTMLElement): void {
  if (!element) return;

  // Remove highlight classes individually
  element.classList.remove(HIGHLIGHT_CLASSES.BASE as string);
  element.classList.remove(HIGHLIGHT_CLASSES.ACTIVE as string);
  element.classList.remove(HIGHLIGHT_CLASSES.FADING as string);
  element.classList.remove(HIGHLIGHT_CLASSES.CONTAINER as string);

  // Remove highlight attributes
  element.removeAttribute("data-highlight-id");
  element.removeAttribute("data-highlight-type");
}

// Cleanup function for when the module is no longer needed
export function destroyHighlightManager(): void {
  if (globalHighlightManager) {
    globalHighlightManager.destroy();
    globalHighlightManager = null;
  }
}
