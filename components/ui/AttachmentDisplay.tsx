"use client";

import React from "react";
import {
  Image as ImageIcon,
  Mic,
  Globe,
  ExternalLink,
  Clock,
} from "lucide-react";
import { UploadedImage } from "../features/modality/ImageUpload";
import { WebSearchData } from "../features/modality/WebSearch";
import { CopyButton } from "./CopyButton";

interface AttachmentDisplayProps {
  images?: UploadedImage[];
  audioBlob?: Blob;
  audioDuration?: number;
  webSearchData?: WebSearchData;
  className?: string;
}

export function AttachmentDisplay({
  images,
  audioBlob,
  audioDuration,
  webSearchData,
  className = "",
}: AttachmentDisplayProps) {
  const hasAttachments =
    (images && images.length > 0) || audioBlob || webSearchData;

  if (!hasAttachments) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Images */}
      {images && images.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">
              Images ({images.length})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.preview}
                  alt={image.name}
                  className="w-full aspect-square object-cover rounded-md border border-gray-600"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-medium px-2 py-1 bg-black/70 rounded">
                    {image.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio */}
      {audioBlob && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">
                Voice Recording
              </span>
            </div>
            {audioDuration && (
              <span className="text-xs text-gray-500">
                {formatDuration(audioDuration)}
              </span>
            )}
          </div>
          <audio
            controls
            className="w-full h-8"
            src={URL.createObjectURL(audioBlob)}
          />
        </div>
      )}

      {/* Web Search Results */}
      {webSearchData && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">
                Web Search
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(webSearchData.searchedAt)}</span>
              </div>
              <CopyButton
                text={`Search: "${webSearchData.query}"\n\nResults:\n${webSearchData.results.map((r) => `${r.title}\n${r.snippet}\n${r.url}`).join("\n\n")}`}
                size="sm"
              />
            </div>
          </div>

          {/* Search Query */}
          <div className="bg-gray-900/50 rounded-md p-2 mb-3">
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Query:</span> "
              {webSearchData.query}"
            </p>
          </div>

          {/* Search Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {webSearchData.results.slice(0, 5).map((result, index) => (
              <div
                key={index}
                className="bg-gray-900/50 rounded-md p-3 hover:bg-gray-900/70 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200 mb-1 line-clamp-2">
                      {result.title}
                    </h4>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {result.snippet}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="truncate">
                        {result.source || new URL(result.url).hostname}
                      </span>
                      {result.publishedDate && (
                        <>
                          <span>•</span>
                          <span>{result.publishedDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 p-1 text-gray-400 hover:text-purple-400 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {webSearchData.results.length > 5 && (
            <div className="text-xs text-gray-500 text-center mt-2">
              Showing 5 of {webSearchData.results.length} results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
