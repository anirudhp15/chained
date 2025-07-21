"use client";

import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Image as ImageIcon, AlertCircle } from "lucide-react";
import { validateImageFile, compressImage } from "../../lib/modality-utils";

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  uploading?: boolean;
  error?: string;
  type: string;
  uploadProgress: number;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 3,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      const remainingSlots = maxImages - images.length;
      const filesToProcess = files.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          // Show error for invalid files
          const errorImage: UploadedImage = {
            id: `error-${Date.now()}-${Math.random()}`,
            file,
            preview: "",
            name: file.name,
            size: file.size,
            error: validation.error,
            type: file.type,
            uploadProgress: 0,
          };
          onImagesChange([...images, errorImage]);
          continue;
        }

        // Create preview and add to images
        const preview = URL.createObjectURL(file);
        const newImage: UploadedImage = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          name: file.name,
          size: file.size,
          uploading: true,
          type: file.type,
          uploadProgress: 0,
        };

        const updatedImages = [...images, newImage];
        onImagesChange(updatedImages);

        try {
          // Compress the image
          const compressedFile = await compressImage(file);

          // Update with compressed file
          const updatedImage: UploadedImage = {
            ...newImage,
            file: compressedFile,
            size: compressedFile.size,
            uploading: false,
            type: compressedFile.type,
            uploadProgress: 0,
          };

          const finalImages = updatedImages.map((img: UploadedImage) =>
            img.id === newImage.id ? updatedImage : img
          );
          onImagesChange(finalImages);
        } catch (error) {
          // Update with error
          const errorImages = updatedImages.map((img: UploadedImage) =>
            img.id === newImage.id
              ? { ...img, uploading: false, error: "Failed to process image" }
              : img
          );
          onImagesChange(errorImages);
        }
      }
    },
    [images, maxImages, onImagesChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      processFiles(acceptedFiles);
    },
    [processFiles, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    multiple: true,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const removeImage = (id: string) => {
    const imageToRemove = images.find((img) => img.id === id);
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canAddMore = images.length < maxImages && !disabled;
  const hasErrors = images.some((img) => img.error);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer
            ${
              isDragActive || dragActive
                ? "border-lavender-400 bg-lavender-500/10"
                : "border-gray-600 hover:border-gray-500"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} ref={fileInputRef} />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            ref={fileInputRef}
          />

          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-300">
              <span className="font-medium">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF, WebP up to 10MB ({maxImages - images.length}{" "}
              remaining)
            </p>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
            >
              {/* Image Preview */}
              {!image.error && (
                <div className="aspect-square relative">
                  <img
                    src={image.preview}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Loading Overlay */}
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-lavender-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}

              {/* Error State */}
              {image.error && (
                <div className="aspect-square flex flex-col items-center justify-center p-3 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                  <p className="text-xs text-red-400 leading-tight">
                    {image.error}
                  </p>
                </div>
              )}

              {/* Image Info */}
              <div className="p-2 bg-gray-900/90">
                <p className="text-xs text-gray-300 truncate font-medium">
                  {image.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(image.size / 1024).toFixed(1)} KB
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status Messages */}
      {hasErrors && (
        <div className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          Some images couldn't be processed. Please try again.
        </div>
      )}

      {images.length >= maxImages && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <ImageIcon size={12} />
          Maximum {maxImages} images reached
        </div>
      )}
    </div>
  );
}
