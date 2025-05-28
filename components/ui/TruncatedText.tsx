import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  className?: string;
  buttonClassName?: string;
  showButtonText?: string;
  hideButtonText?: string;
  gradientFrom?: string;
}

export function TruncatedText({
  text,
  maxLines = 3,
  className = "",
  buttonClassName = "",
  showButtonText = "Show more",
  hideButtonText = "Show less",
  gradientFrom = "from-gray-800",
}: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const [lineHeight, setLineHeight] = useState(24);
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current && containerRef.current) {
        // Get computed styles
        const computedStyle = window.getComputedStyle(textRef.current);
        const computedLineHeight = parseFloat(computedStyle.lineHeight);
        const actualLineHeight = isNaN(computedLineHeight)
          ? parseFloat(computedStyle.fontSize) * 1.5
          : computedLineHeight;

        setLineHeight(actualLineHeight);

        // Calculate if text should be truncated
        const maxHeight = actualLineHeight * maxLines;
        const actualHeight = textRef.current.scrollHeight;

        setShouldTruncate(actualHeight > maxHeight + 5); // 5px tolerance
      }
    };

    // Check truncation after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkTruncation, 100);

    // Also check on resize
    window.addEventListener("resize", checkTruncation);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [text, maxLines]);

  const maxHeight = lineHeight * maxLines;

  if (!shouldTruncate) {
    return (
      <div className={className}>
        <p ref={textRef} className="leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {/* Visible text container */}
      <div className="relative">
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden relative"
          style={{
            maxHeight: isExpanded ? "none" : `${maxHeight}px`,
          }}
        >
          <p ref={textRef} className="leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        </div>

        {/* Gradient overlay when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none">
            <div
              className={`w-full h-full bg-gradient-to-t ${gradientFrom} via-gray-800/80 to-transparent`}
            />
          </div>
        )}

        {/* Show more/less button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500/50 rounded-md text-gray-300 hover:text-white transition-all group text-sm ${buttonClassName}`}
        >
          <span className="font-medium">
            {isExpanded ? hideButtonText : showButtonText}
          </span>
          {isExpanded ? (
            <ChevronUp
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
          ) : (
            <ChevronDown
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
          )}
        </button>
      </div>
    </div>
  );
}
