import React, { useEffect, useRef, useState } from "react";
import { useVisualHighlights } from "../../lib/copy-tracking-context";
import type { HighlightType } from "../../lib/highlight-tracking";

interface HighlightWrapperProps {
  children: React.ReactNode;
  content: string;
  contentId?: string;
  highlightType?: HighlightType;
  className?: string;
  disabled?: boolean;
}

export function HighlightWrapper({
  children,
  content,
  contentId,
  highlightType = "copy",
  className = "",
  disabled = false,
}: HighlightWrapperProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { highlights } = useVisualHighlights();

  // Generate unique content ID if not provided
  const uniqueContentId =
    contentId ||
    `content-${content.slice(0, 50).replace(/\s+/g, "-").toLowerCase()}`;

  // Find active highlight for this content from copy tracking context
  const activeHighlight = highlights.find((h) => h.content === content);
  const isHighlighted = !!activeHighlight;

  // Apply highlight effect when content is highlighted
  useEffect(() => {
    if (!disabled && activeHighlight && elementRef.current) {
      const element = elementRef.current;

      // Apply CSS classes
      element.classList.add("copy-highlight");
      element.classList.add("copy-highlight-active");
      element.setAttribute("data-highlight-id", activeHighlight.id);
      element.setAttribute("data-highlight-content", content.slice(0, 100));

      // Set up fade-out timer based on highlight's fadeOut state
      let fadeTimer: NodeJS.Timeout;
      let removeTimer: NodeJS.Timeout;

      if (!activeHighlight.fadeOut) {
        fadeTimer = setTimeout(() => {
          if (element) {
            element.classList.remove("copy-highlight-active");
            element.classList.add("copy-highlight-fading");
          }
        }, 3000); // Start fading after 3 seconds
      } else {
        // Already fading
        element.classList.remove("copy-highlight-active");
        element.classList.add("copy-highlight-fading");
      }

      // Set up removal timer
      removeTimer = setTimeout(() => {
        if (element) {
          element.classList.remove("copy-highlight");
          element.classList.remove("copy-highlight-fading");
          element.removeAttribute("data-highlight-id");
          element.removeAttribute("data-highlight-content");
        }
      }, 4000); // Remove after 4 seconds

      // Cleanup function
      return () => {
        if (fadeTimer) clearTimeout(fadeTimer);
        if (removeTimer) clearTimeout(removeTimer);
        if (element) {
          element.classList.remove(
            "copy-highlight",
            "copy-highlight-active",
            "copy-highlight-fading"
          );
          element.removeAttribute("data-highlight-id");
          element.removeAttribute("data-highlight-content");
        }
      };
    }
  }, [activeHighlight, content, disabled]);

  // Handle manual highlight removal
  const { removeHighlight } = useVisualHighlights();

  const handleRemoveHighlight = () => {
    if (activeHighlight && elementRef.current) {
      const element = elementRef.current;
      element.classList.remove(
        "copy-highlight",
        "copy-highlight-active",
        "copy-highlight-fading"
      );
      element.removeAttribute("data-highlight-id");
      element.removeAttribute("data-highlight-content");
      removeHighlight(activeHighlight.id);
    }
  };

  return (
    <div
      ref={elementRef}
      className={`highlight-wrapper ${className}`}
      data-content-id={uniqueContentId}
      data-highlightable={!disabled}
      onClick={activeHighlight ? handleRemoveHighlight : undefined}
      style={{
        cursor: activeHighlight ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

// Higher-order component version for easier wrapping
export function withHighlight<P extends object>(
  Component: React.ComponentType<P>,
  getContent: (props: P) => string,
  options?: {
    contentId?: (props: P) => string;
    highlightType?: HighlightType;
    disabled?: (props: P) => boolean;
  }
) {
  return function HighlightedComponent(props: P) {
    const content = getContent(props);
    const contentId = options?.contentId?.(props);
    const highlightType = options?.highlightType || "copy";
    const disabled = options?.disabled?.(props) || false;

    return (
      <HighlightWrapper
        content={content}
        contentId={contentId}
        highlightType={highlightType}
        disabled={disabled}
      >
        <Component {...props} />
      </HighlightWrapper>
    );
  };
}

// Utility hook for manual highlight control
export function useHighlightControl(content: string, contentId?: string) {
  const { highlights, addHighlight, removeHighlight } = useVisualHighlights();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const activeHighlight = highlights.find((h) => h.content === content);
  const isHighlighted = !!activeHighlight;

  const triggerHighlight = (type: HighlightType = "copy") => {
    if (!isHighlighted) {
      const newHighlight = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        elementId: contentId,
      };
      addHighlight(newHighlight);
      setHighlightId(newHighlight.id);
      return newHighlight.id;
    }
    return null;
  };

  const removeCurrentHighlight = () => {
    if (activeHighlight) {
      removeHighlight(activeHighlight.id);
      setHighlightId(null);
    }
  };

  return {
    isHighlighted,
    highlightId: activeHighlight?.id || highlightId,
    triggerHighlight,
    removeCurrentHighlight,
  };
}
