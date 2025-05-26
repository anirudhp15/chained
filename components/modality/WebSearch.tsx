"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  Clock,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

export interface WebSearchData {
  query: string;
  results: SearchResult[];
  searchedAt: number;
}

interface WebSearchProps {
  onSearchComplete: (searchData: WebSearchData) => void;
  disabled?: boolean;
  className?: string;
}

interface SearchResultsDisplayProps {
  searchData: WebSearchData;
  isLoading?: boolean;
}

export function SearchResultsDisplay({
  searchData,
  isLoading = false,
}: SearchResultsDisplayProps) {
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
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-lavender-400" />
          <span className="text-sm font-medium text-gray-300">Web Search</span>
          {isLoading && (
            <Loader2 className="h-4 w-4 text-lavender-400 animate-spin" />
          )}
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatTimeAgo(searchData.searchedAt)}</span>
        </div>
      </div>

      {/* Search Query */}
      <div className="bg-gray-900 rounded-md p-3">
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Query:</span> "{searchData.query}"
        </p>
      </div>

      {/* Search Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {searchData.results.map((result, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-md p-3 hover:bg-gray-850 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-200 mb-1 line-clamp-2">
                    {result.title}
                  </h4>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-3">
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
                  className="ml-3 p-1 text-gray-400 hover:text-lavender-400 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && (
        <div className="text-xs text-gray-500 text-center">
          Found {searchData.results.length} results
        </div>
      )}
    </div>
  );
}

export function WebSearch({
  onSearchComplete,
  disabled = false,
  className = "",
}: WebSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<WebSearchData | null>(
    null
  );

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/web-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (response.ok) {
        const searchData = await response.json();
        setSearchResults(searchData);
        onSearchComplete(searchData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      setError("Failed to perform search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}
    >
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search the web..."
              disabled={disabled || isSearching}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={disabled || isSearching || !query.trim()}
            className={`
              p-2 rounded-md transition-all
              ${
                disabled || isSearching || !query.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-lavender-600 hover:bg-lavender-700 text-white"
              }
            `}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>

        {isSearching && (
          <div className="mt-3 text-xs text-gray-500 flex items-center space-x-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Searching the web...</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Search Results Preview */}
      {searchResults && (
        <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              Search Results for "{searchResults.query}"
            </span>
            <span className="text-xs text-gray-500">
              {searchResults.results.length} results
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {searchResults.results.slice(0, 3).map((result, index) => (
              <div key={index} className="text-xs">
                <div className="font-medium text-gray-300 truncate">
                  {result.title}
                </div>
                <div className="text-gray-500 truncate">{result.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
