"use client";

import {
  useQuery,
  useMutation,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInButton } from "@clerk/nextjs";
import {
  Search,
  X,
  Trash2,
  Check,
  Clock,
  Calendar,
  Archive,
  Sun,
  MessageSquare,
  Command,
  Link2,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../components/chat/sidebar";
import { MobileSidebarToggle } from "../../components/MobileSidebarToggle";
import { motion } from "framer-motion";

interface ChainGroup {
  title: string;
  chains: any[];
}

// Enhanced search functionality with fuzzy matching
const useSearchFilter = (chains: any[], searchQuery: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return chains;

    const query = searchQuery.toLowerCase();
    return chains
      .filter((chain) => {
        const title = chain.title.toLowerCase();

        // Exact match gets highest priority
        if (title.includes(query)) return true;

        // Fuzzy matching - check if all characters in query exist in title in order
        let queryIndex = 0;
        for (let i = 0; i < title.length && queryIndex < query.length; i++) {
          if (title[i] === query[queryIndex]) {
            queryIndex++;
          }
        }
        return queryIndex === query.length;
      })
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        // Prioritize exact matches
        const aExact = aTitle.includes(query);
        const bExact = bTitle.includes(query);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then by title length (shorter = more relevant)
        return aTitle.length - bTitle.length;
      });
  }, [chains, searchQuery]);
};

// Highlight search terms in text
const HighlightedText = ({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery: string;
}) => {
  if (!searchQuery.trim()) return <span>{text}</span>;

  const query = searchQuery.toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(query);

  if (index === -1) return <span>{text}</span>;

  return (
    <span>
      {text.substring(0, index)}
      <span className="bg-lavender-500/30 text-lavender-200 font-medium">
        {text.substring(index, index + query.length)}
      </span>
      {text.substring(index + query.length)}
    </span>
  );
};

// Helper function to group chains by time periods
const groupChainsByTime = (chains: any[]): ChainGroup[] => {
  if (!chains) return [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: ChainGroup[] = [
    { title: "Today", chains: [] },
    { title: "Yesterday", chains: [] },
    { title: "Last 7 days", chains: [] },
    { title: "Older", chains: [] },
  ];

  chains.forEach((chain) => {
    const chainDate = new Date(chain._creationTime);

    if (chainDate >= today) {
      groups[0].chains.push(chain);
    } else if (chainDate >= yesterday) {
      groups[1].chains.push(chain);
    } else if (chainDate >= lastWeek) {
      groups[2].chains.push(chain);
    } else {
      groups[3].chains.push(chain);
    }
  });

  // Filter out empty groups
  return groups.filter((group) => group.chains.length > 0);
};

// Helper function to get icon for each time period
const getGroupIcon = (groupTitle: string) => {
  switch (groupTitle) {
    case "Today":
      return <Sun size={16} className="text-lavender-400/70" />;
    case "Yesterday":
      return <Clock size={16} className="text-gray-500" />;
    case "Last 7 days":
      return <Calendar size={16} className="text-gray-500" />;
    case "Older":
      return <Archive size={16} className="text-gray-600" />;
    default:
      return <MessageSquare size={16} className="text-gray-500" />;
  }
};

// Helper function to format date
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date >= today) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (date >= yesterday) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString();
  }
};

// Subtle Grid Animation Component
const SubtleGridBackground = () => {
  return (
    <motion.div
      className="fixed inset-0 opacity-[0.15] pointer-events-none z-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(147,112,219,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147,112,219,0.3) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        filter: "blur(0.5px)",
      }}
      animate={{
        backgroundPosition: ["0px 0px", "60px 60px", "0px 0px"],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

function ChainsContent() {
  const { user } = useUser();
  const router = useRouter();
  const chains = useQuery(api.queries.getChatSessions);
  const deleteChain = useMutation(api.mutations.deleteSession);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Apply search filter
  const filteredChains = useSearchFilter(chains || [], searchQuery);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape to clear search or exit selection mode
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        } else if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedChains(new Set());
        }
      }

      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && isSelectionMode) {
        e.preventDefault();
        const allChainIds = new Set(filteredChains.map((chain) => chain._id));
        setSelectedChains(allChainIds);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [searchQuery, isSelectionMode, filteredChains]);

  const clearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const toggleChainSelection = (chainId: string) => {
    const newSelected = new Set(selectedChains);
    if (newSelected.has(chainId)) {
      newSelected.delete(chainId);
    } else {
      newSelected.add(chainId);
    }
    setSelectedChains(newSelected);
  };

  const selectAllChains = () => {
    const allChainIds = new Set(filteredChains.map((chain) => chain._id));
    setSelectedChains(allChainIds);
  };

  const deselectAllChains = () => {
    setSelectedChains(new Set());
  };

  const deleteSelectedChains = async () => {
    const chainIds = Array.from(selectedChains);
    try {
      await Promise.all(
        chainIds.map((chainId) =>
          deleteChain({ sessionId: chainId as Id<"chatSessions"> })
        )
      );
      setSelectedChains(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error deleting chains:", error);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedChains(new Set());
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 relative overflow-hidden">
      {/* Subtle Grid Background */}
      <SubtleGridBackground />

      {/* Sidebar */}
      <Sidebar
        currentSessionId={undefined}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={toggleMobileSidebar}
      />

      {/* Mobile Sidebar Toggle */}
      <MobileSidebarToggle
        isOpen={isMobileSidebarOpen}
        onToggle={toggleMobileSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 relative z-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Link2 size={28} className="text-lavender-400" />
                <h1 className="text-3xl font-bold text-white">
                  Your chain history
                </h1>
              </div>
              {chains && (
                <p className="text-gray-400">
                  You have {chains.length} previous{" "}
                  {chains.length === 1 ? "chain" : "chains"} with ChainedChat.{" "}
                  {filteredChains.length !== chains.length && (
                    <span className="text-lavender-400">
                      Showing {filteredChains.length} filtered results.
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative flex focus:outline-none rounded-lg items-center flex-row text-sm group max-w-md">
                <div className="p-3 rounded-l-lg bg-gray-800 flex items-center pointer-events-none">
                  <Search
                    size={20}
                    className={`transition-colors duration-200 ${
                      isSearchFocused ? "text-lavender-400" : "text-gray-300"
                    }`}
                  />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search your chains..."
                  className="w-full p-3 bg-gray-800 rounded-r-lg text-white placeholder-gray-400 focus:outline-none transition-all duration-200 focus:shadow-md outline-none border-r-0"
                />

                {/* Keyboard shortcut hint */}
                {!isSearchFocused && !searchQuery && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Command size={14} />
                      <span>K</span>
                    </div>
                  </div>
                )}

                {/* Clear button */}
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search results counter */}
              {searchQuery && (
                <div className="mt-4 text-sm text-lavender-400">
                  {filteredChains.length} result
                  {filteredChains.length !== 1 ? "s" : ""}
                  {filteredChains.length !== (chains?.length || 0) && (
                    <span> of {chains?.length || 0}</span>
                  )}
                </div>
              )}
            </div>

            {/* Selection Controls */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isSelectionMode ? (
                  <>
                    <span className="text-sm text-lavender-400 font-medium">
                      {selectedChains.size} selected{" "}
                      {selectedChains.size === 1 ? "chain" : "chains"}
                    </span>
                    <button
                      onClick={selectAllChains}
                      className="text-sm text-lavender-400 hover:text-lavender-300 transition-colors duration-200"
                    >
                      Select all
                    </button>
                    <button
                      onClick={toggleSelectionMode}
                      className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  filteredChains.length > 0 && (
                    <button
                      onClick={toggleSelectionMode}
                      className="text-sm text-lavender-400 hover:text-lavender-300 transition-colors duration-200 font-medium"
                    >
                      Select chains
                    </button>
                  )
                )}
              </div>

              {selectedChains.size > 0 && (
                <button
                  onClick={deleteSelectedChains}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Delete Selected
                </button>
              )}
            </div>

            {/* Chains List */}
            <div className="space-y-6">
              {chains === undefined ? (
                // Loading state
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-row items-center gap-3">
                    <div className="relative">
                      <Link2
                        size={24}
                        className="text-lavender-400 animate-pulse"
                      />
                      <div className="absolute inset-0 animate-ping">
                        <Link2 size={24} className="text-lavender-400/30" />
                      </div>
                    </div>
                    <span className="text-gray-400">Loading chains...</span>
                  </div>
                </div>
              ) : filteredChains.length === 0 ? (
                // Empty state
                <div className="py-16 text-center">
                  {searchQuery ? (
                    <>
                      <Search
                        size={48}
                        className="mx-auto text-gray-600 mb-4"
                      />
                      <h3 className="text-xl font-medium text-gray-400 mb-2">
                        No chains found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Try a different search term or{" "}
                        <button
                          onClick={clearSearch}
                          className="text-lavender-400 hover:text-lavender-300 transition-colors duration-200"
                        >
                          clear your search
                        </button>
                      </p>
                    </>
                  ) : (
                    <>
                      <MessageSquare
                        size={48}
                        className="mx-auto text-gray-600 mb-4 animate-pulse"
                      />
                      <h3 className="text-xl font-medium text-gray-400 mb-2">
                        No chains yet
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Create your first chain to get started
                      </p>
                      <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-all duration-200 font-medium"
                      >
                        <Link2 size={20} />
                        Create Chain
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                // Grouped chains - use filtered results
                (searchQuery
                  ? // Show flat list when searching
                    [{ title: "Search Results", chains: filteredChains }]
                  : // Show grouped list when not searching
                    groupChainsByTime(filteredChains)
                ).map((group, groupIndex) => (
                  <div
                    key={group.title}
                    className={`${groupIndex > 0 ? "mt-8" : ""}`}
                  >
                    {!searchQuery && (
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-800">
                        {getGroupIcon(group.title)}
                        <h2 className="text-lg font-semibold text-lavender-400">
                          {group.title}
                        </h2>
                        <span className="text-sm text-gray-500">
                          ({group.chains.length})
                        </span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {group.chains.map((chain) => (
                        <div
                          key={chain._id}
                          className={`group relative p-4 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-lg transition-all duration-200 ${
                            selectedChains.has(chain._id)
                              ? "ring-2 ring-lavender-500 bg-lavender-500/5"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Selection checkbox */}
                            {isSelectionMode && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleChainSelection(chain._id);
                                }}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                  selectedChains.has(chain._id)
                                    ? "bg-lavender-500 border-lavender-500"
                                    : "border-gray-600 hover:border-lavender-400"
                                }`}
                              >
                                {selectedChains.has(chain._id) && (
                                  <Check size={12} className="text-white" />
                                )}
                              </button>
                            )}

                            {/* Chain content */}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/chat/${chain._id}`}
                                className="block"
                                onClick={(e) => {
                                  if (isSelectionMode) {
                                    e.preventDefault();
                                    toggleChainSelection(chain._id);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-white group-hover:text-lavender-300 transition-colors duration-200 truncate">
                                      <HighlightedText
                                        text={chain.title}
                                        searchQuery={searchQuery}
                                      />
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Last message{" "}
                                      {formatDate(
                                        chain.updatedAt || chain.createdAt
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <MessageSquare size={14} />
                                    <span>Chain</span>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChainsPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Welcome to Chained
            </h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access your chain history
            </p>
            <SignInButton mode="modal">
              <button className="bg-lavender-500 hover:bg-lavender-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ChainsContent />
      </Authenticated>
    </>
  );
}
