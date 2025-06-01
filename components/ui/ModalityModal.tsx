"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Paperclip,
  Mic,
  Search,
  Upload,
  Camera,
  Image as ImageIcon,
  Globe,
  Check,
  AlertCircle,
} from "lucide-react";

interface ModalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "file" | "voice" | "search";
  onFileSelect?: (files: FileList) => void;
  onWebSearchToggle?: (enabled: boolean) => void;
  isWebSearchEnabled?: boolean;
  selectedModel?: string;
}

export function ModalityModal({
  isOpen,
  onClose,
  type,
  onFileSelect,
  onWebSearchToggle,
  isWebSearchEnabled = false,
  selectedModel,
}: ModalityModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && onFileSelect) {
      onFileSelect(files);
      onClose();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleWebSearchToggle = () => {
    if (onWebSearchToggle) {
      onWebSearchToggle(!isWebSearchEnabled);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = () => {
    switch (type) {
      case "file":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="h-12 w-12 text-lavender-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Upload Files
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Select images to add to your message
              </p>
            </div>

            <div className="flex text-xs lg:text-sm flex-row gap-2">
              <button
                onClick={triggerFileInput}
                className="w-full flex items-center justify-center space-x-3 p-2 lg:p-4 bg-lavender-600 hover:bg-lavender-700 text-white rounded-lg transition-colors"
              >
                <ImageIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="font-medium">Choose from Gallery</span>
              </button>

              <button
                onClick={() => {
                  // For mobile camera access
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.capture = "environment";
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && onFileSelect) {
                      onFileSelect(files);
                      onClose();
                    }
                  };
                  input.click();
                }}
                className="w-full flex items-center justify-center space-x-3 p-2 lg:p-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                <Camera className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="font-medium">Take Photo</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        );

      case "voice":
        return (
          <div className="space-y-6 text-center">
            <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              Voice Input
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Voice-to-text functionality is coming soon
            </p>
            <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Feature in development</span>
              </div>
            </div>
            <button
              disabled
              className="w-full p-4 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        );

      case "search":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Globe className="h-12 w-12 text-lavender-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Web Search
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Allow {selectedModel} to search the web for current information
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Search className="h-5 w-5 text-lavender-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-200">
                      Enable Web Search
                    </div>
                    <div className="text-xs text-gray-400">
                      Access real-time information from the internet
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleWebSearchToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isWebSearchEnabled ? "bg-lavender-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isWebSearchEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isWebSearchEnabled && (
                <div className="p-3 bg-lavender-500/10 border border-lavender-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-lavender-400">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Web search enabled
                    </span>
                  </div>
                  <p className="text-xs text-lavender-300/80 mt-1">
                    The AI can now search for current information to enhance
                    responses
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-gray-900/75 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            {type === "file" && (
              <Paperclip className="h-5 w-5 text-lavender-400" />
            )}
            {type === "voice" && <Mic className="h-5 w-5 text-gray-400" />}
            {type === "search" && (
              <Search className="h-5 w-5 text-lavender-400" />
            )}
            <span className="text-lg font-semibold text-gray-200">
              {type === "file" && "File Upload"}
              {type === "voice" && "Voice Input"}
              {type === "search" && "Web Search"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors rounded-md hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{modalContent()}</div>
      </div>
    </div>,
    document.body
  );
}
