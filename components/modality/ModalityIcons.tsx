"use client";

import React, { useState } from "react";
import { Paperclip, Mic, Search } from "lucide-react";
import {
  supportsImageUpload,
  supportsAudioInput,
  supportsWebSearch,
  validateImageFile,
  compressImage,
} from "../../lib/modality-utils";
import { UploadedImage } from "./ImageUpload";
import { ModalityModal } from "../ui/ModalityModal";

interface ModalityIconsProps {
  selectedModel: string;
  onImagesChange: (images: UploadedImage[]) => void;
  onWebSearchToggle: (enabled: boolean) => void;
  isWebSearchEnabled?: boolean;
  images: UploadedImage[];
  className?: string;
}

type ActiveModal = "file" | "voice" | "search" | null;

export function ModalityIcons({
  selectedModel,
  onImagesChange,
  onWebSearchToggle,
  isWebSearchEnabled = false,
  images,
  className = "",
}: ModalityIconsProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const imageSupported = supportsImageUpload(selectedModel);
  const audioSupported = supportsAudioInput(selectedModel);
  const searchSupported = supportsWebSearch(selectedModel);

  const closeModal = () => setActiveModal(null);

  const iconBaseClasses = "p-2 rounded-md transition-all";
  const enabledClasses =
    "text-gray-400 hover:text-lavender-400 hover:bg-gray-600";
  const disabledClasses = "text-gray-600 cursor-not-allowed opacity-50";
  const activeClasses = "text-lavender-400 bg-lavender-600/20";

  // Handle file selection from modal
  const handleFileSelect = async (files: FileList) => {
    const newImages: UploadedImage[] = [];

    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i];
      const validation = validateImageFile(file);

      if (validation.valid) {
        try {
          // Compress image if needed
          const processedFile = await compressImage(file);

          const image: UploadedImage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            file: processedFile,
            preview: URL.createObjectURL(processedFile),
            name: processedFile.name,
            size: processedFile.size,
            type: processedFile.type,
            uploadProgress: 100,
          };

          newImages.push(image);
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }
  };

  return (
    <>
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* File Upload Icon */}
        <button
          onClick={() => imageSupported && setActiveModal("file")}
          disabled={!imageSupported}
          className={`${iconBaseClasses} ${
            imageSupported ? enabledClasses : disabledClasses
          } ${images.length > 0 ? activeClasses : ""} relative`}
          title={
            imageSupported
              ? `Upload images${images.length > 0 ? ` (${images.length})` : ""}`
              : `Image upload not supported by ${selectedModel}`
          }
        >
          <Paperclip size={18} />
          {images.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-lavender-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {images.length}
            </span>
          )}
        </button>

        {/* Voice Input Icon - Coming Soon */}
        {/* <button
          onClick={() => audioSupported && setActiveModal("voice")}
          disabled={!audioSupported}
          className={`${iconBaseClasses} ${
            audioSupported ? enabledClasses : disabledClasses
          } relative`}
          title={
            audioSupported
              ? "Voice input (Coming Soon)"
              : `Voice input not supported by ${selectedModel}`
          }
        >
          <Mic size={18} />
        </button> */}

        {/* Web Search Toggle */}
        {/* <button
          onClick={() => searchSupported && setActiveModal("search")}
          disabled={!searchSupported}
          className={`${iconBaseClasses} ${
            searchSupported ? enabledClasses : disabledClasses
          } ${isWebSearchEnabled ? activeClasses : ""} relative`}
          title={
            searchSupported
              ? `Web search ${isWebSearchEnabled ? "enabled" : "disabled"}`
              : `Web search not supported by ${selectedModel}`
          }
        >
          <Search size={18} />
          {isWebSearchEnabled && (
            <span className="absolute -top-1 -right-1 bg-lavender-500 text-white text-xs rounded-full h-3 w-3"></span>
          )}
        </button> */}
      </div>

      {/* Modal */}
      <ModalityModal
        isOpen={activeModal !== null}
        onClose={closeModal}
        type={activeModal || "file"}
        onFileSelect={handleFileSelect}
        onWebSearchToggle={onWebSearchToggle}
        isWebSearchEnabled={isWebSearchEnabled}
        selectedModel={selectedModel}
      />
    </>
  );
}
