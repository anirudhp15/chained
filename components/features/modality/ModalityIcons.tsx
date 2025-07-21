"use client";

import React, { useRef } from "react";
import { Paperclip } from "lucide-react";
import {
  supportsImageUpload,
  validateImageFile,
  compressImage,
} from "../../../lib/modality-utils";
import { UploadedImage } from "./ImageUpload";

interface ModalityIconsProps {
  selectedModel: string;
  onImagesChange: (images: UploadedImage[]) => void;
  onWebSearchToggle: (enabled: boolean) => void;
  isWebSearchEnabled?: boolean;
  images: UploadedImage[];
  className?: string;
}

export function ModalityIcons({
  selectedModel,
  onImagesChange,
  onWebSearchToggle,
  isWebSearchEnabled = false,
  images,
  className = "",
}: ModalityIconsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageSupported = supportsImageUpload(selectedModel);

  const iconBaseClasses = "p-2 rounded-md transition-all";
  const enabledClasses =
    "text-gray-400 hover:text-lavender-400 hover:bg-gray-600";
  const disabledClasses = "text-gray-600 cursor-not-allowed opacity-50";
  const activeClasses = "text-lavender-400 bg-lavender-600/20";

  // Handle file selection directly
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

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Trigger file input directly
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* File Upload Icon */}
      <button
        onClick={() => imageSupported && triggerFileInput()}
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

      {/* Hidden file input */}
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
}
