"use client";

import React, { useState } from "react";
import { Paperclip, Mic, Search, X } from "lucide-react";
import {
  supportsImageUpload,
  supportsAudioInput,
  supportsWebSearch,
} from "../../lib/modality-utils";
import { ImageUpload, UploadedImage } from "./ImageUpload";
import { VoiceRecorder } from "./VoiceRecorder";
import { WebSearch, WebSearchData } from "./WebSearch";

interface ModalityIconsProps {
  selectedModel: string;
  onImagesChange: (images: UploadedImage[]) => void;
  onAudioRecording: (
    audioBlob: Blob,
    duration: number,
    transcription: string
  ) => void;
  onWebSearch: (searchData: WebSearchData) => void;
  images: UploadedImage[];
  className?: string;
}

type ActiveModal = "image" | "audio" | "search" | null;

export function ModalityIcons({
  selectedModel,
  onImagesChange,
  onAudioRecording,
  onWebSearch,
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
    "text-gray-400 hover:text-lavender-400 hover:bg-gray-700";
  const disabledClasses = "text-gray-600 cursor-not-allowed opacity-50";

  return (
    <>
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* Image Upload Icon */}
        <button
          onClick={() => imageSupported && setActiveModal("image")}
          disabled={!imageSupported}
          className={`${iconBaseClasses} ${imageSupported ? enabledClasses : disabledClasses}`}
          title={
            imageSupported
              ? "Upload images"
              : `Image upload not supported by ${selectedModel}`
          }
        >
          <Paperclip size={18} />
        </button>

        {/* Voice Recording Icon */}
        <button
          onClick={() => audioSupported && setActiveModal("audio")}
          disabled={!audioSupported}
          className={`${iconBaseClasses} ${audioSupported ? enabledClasses : disabledClasses}`}
          title={
            audioSupported
              ? "Record voice message"
              : `Voice input not supported by ${selectedModel}`
          }
        >
          <Mic size={18} />
        </button>

        {/* Web Search Icon */}
        <button
          onClick={() => searchSupported && setActiveModal("search")}
          disabled={!searchSupported}
          className={`${iconBaseClasses} ${searchSupported ? enabledClasses : disabledClasses}`}
          title={
            searchSupported
              ? "Search the web"
              : `Web search not supported by ${selectedModel}`
          }
        >
          <Search size={18} />
        </button>
      </div>

      {/* Modal Overlays */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200">
                {activeModal === "image" && "Upload Images"}
                {activeModal === "audio" && "Record Voice Message"}
                {activeModal === "search" && "Search the Web"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {activeModal === "image" && (
                <ImageUpload
                  images={images}
                  onImagesChange={onImagesChange}
                  maxImages={3}
                />
              )}

              {activeModal === "audio" && (
                <VoiceRecorder
                  onRecordingComplete={(audioBlob, duration, transcription) => {
                    onAudioRecording(audioBlob, duration, transcription);
                    closeModal();
                  }}
                  onRecordingCancel={closeModal}
                />
              )}

              {activeModal === "search" && (
                <WebSearch
                  onSearchComplete={(searchData: WebSearchData) => {
                    onWebSearch(searchData);
                    closeModal();
                  }}
                />
              )}
            </div>

            {/* Modal Footer */}
            {activeModal === "image" && (
              <div className="p-4 border-t border-gray-700 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-lavender-600 hover:bg-lavender-700 text-white rounded-md transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
