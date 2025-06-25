"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Check, X, Loader2 } from "lucide-react";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  editTrigger?: "click" | "double-click";
  showEditIcon?: boolean;
  validateOnChange?: (value: string) => string | null; // Return error message or null
}

export function EditableText({
  value,
  onSave,
  placeholder = "Enter text...",
  className = "",
  maxLength = 50,
  disabled = false,
  editTrigger = "click",
  showEditIcon = true,
  validateOnChange,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const startEditing = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const saveEdit = async () => {
    if (isSaving) return;

    const trimmedValue = editValue.trim();

    // Validate
    if (trimmedValue.length === 0) {
      setError("Text cannot be empty");
      return;
    }

    if (trimmedValue.length > maxLength) {
      setError(`Text cannot exceed ${maxLength} characters`);
      return;
    }

    if (validateOnChange) {
      const validationError = validateOnChange(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Don't save if value hasn't changed
    if (trimmedValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleClick = () => {
    if (editTrigger === "click") {
      startEditing();
    }
  };

  const handleDoubleClick = () => {
    if (editTrigger === "double-click") {
      startEditing();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null); // Clear error on change
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Small delay to allow button clicks to register
              setTimeout(() => {
                if (isEditing && !isSaving) {
                  saveEdit();
                }
              }, 150);
            }}
            className={`w-full px-2 text-xs bg-gray-800 border rounded text-white focus:outline-none focus:ring-2 focus:ring-lavender-500 ${
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-600 focus:border-lavender-500"
            }`}
            maxLength={maxLength}
            disabled={isSaving}
          />
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-red-400 mt-1"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={saveEdit}
            disabled={isSaving}
            className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/20 rounded transition-colors duration-200 disabled:opacity-50"
            title="Save (Enter)"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={cancelEditing}
            disabled={isSaving}
            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded transition-colors duration-200 disabled:opacity-50"
            title="Cancel (Escape)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={editTrigger === "click" ? "Click to edit" : "Double-click to edit"}
    >
      <span className="text-gray-300 text-sm font-medium truncate">
        {value || placeholder}
      </span>
      {showEditIcon && !disabled && (
        <Edit3 className="w-3 h-3 text-gray-500 opacity-50 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
      )}
    </div>
  );
}
