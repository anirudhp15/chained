"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
}

export function CopyButton({
  text,
  className = "",
  size = "sm",
  variant = "ghost",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const variantClasses = {
    ghost: "text-gray-400 hover:text-gray-200 hover:bg-gray-700",
    outline:
      "text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-500",
    solid: "text-white bg-gray-600 hover:bg-gray-500",
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-md transition-all duration-200 relative group
        ${className}
      `}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check size={iconSizes[size]} className="text-green-400" />
      ) : (
        <Copy size={iconSizes[size]} />
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {copied ? "Copied!" : "Copy"}
      </div>
    </button>
  );
}
