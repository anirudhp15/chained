"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Plus,
  MessageSquare,
  Link2,
  Link as LinkIcon,
  Link2Off,
  ChevronLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Settings,
  User,
  CreditCard,
  LogOut,
  ChevronUp,
  X,
  Search,
  Command,
  Unlink,
  Clock,
  Calendar,
  Archive,
  Sun,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser, UserButton, SignOutButton, UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/lib/sidebar-context";

interface SidebarProps {
  currentSessionId?: string;
  onLoadPreset?: (agents: any[]) => void;
  // Mobile props
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

interface ChatGroup {
  title: string;
  chats: any[];
}

// Enhanced search functionality with fuzzy matching
const useSearchFilter = (chats: any[], searchQuery: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase();
    return chats
      .filter((chat) => {
        const title = chat.title.toLowerCase();

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
  }, [chats, searchQuery]);
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

// Loading animation component
const LoadingAnimation = () => (
  <div className="flex items-center justify-center py-8 animate-in fade-in duration-300">
    <div className="flex flex-row items-center gap-2">
      <div className="relative">
        <Link2 size={20} className="text-lavender-400 animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Link2 size={20} className="text-lavender-400/30" />
        </div>
      </div>
    </div>
  </div>
);

// Helper function to group chats by time periods
const groupChatsByTime = (chats: any[]): ChatGroup[] => {
  if (!chats) return [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: ChatGroup[] = [
    { title: "Today", chats: [] },
    { title: "Yesterday", chats: [] },
    { title: "Last 7 days", chats: [] },
    { title: "Older", chats: [] },
  ];

  chats.forEach((chat) => {
    const chatDate = new Date(chat._creationTime);

    if (chatDate >= today) {
      groups[0].chats.push(chat);
    } else if (chatDate >= yesterday) {
      groups[1].chats.push(chat);
    } else if (chatDate >= lastWeek) {
      groups[2].chats.push(chat);
    } else {
      groups[3].chats.push(chat);
    }
  });

  // Filter out empty groups
  return groups.filter((group) => group.chats.length > 0);
};

// Helper function to get icon for each time period
const getGroupIcon = (groupTitle: string) => {
  switch (groupTitle) {
    case "Today":
      return <Sun size={12} className="text-lavender-400/70" />;
    case "Yesterday":
      return <Clock size={12} className="text-gray-500" />;
    case "Last 7 days":
      return <Calendar size={12} className="text-gray-500" />;
    case "Older":
      return <Archive size={12} className="text-gray-600" />;
    default:
      return <MessageSquare size={12} className="text-gray-500" />;
  }
};

export function Sidebar({
  currentSessionId,
  onLoadPreset,
  isMobileOpen = false,
  onMobileToggle,
}: SidebarProps) {
  const { user } = useUser();
  const recentChats = useQuery(api.queries.getChatSessions);
  const updateChatTitle = useMutation(api.mutations.updateSessionTitle);
  const deleteChat = useMutation(api.mutations.deleteSession);
  const router = useRouter();

  // Use global sidebar context instead of local state
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isLinkHovered, setIsLinkHovered] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Enhanced search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apply search filter
  const filteredChats = useSearchFilter(recentChats || [], searchQuery);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape to clear search or close mobile sidebar
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        } else if (isMobileOpen && onMobileToggle) {
          onMobileToggle();
        }
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [searchQuery, isMobileOpen, onMobileToggle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setShowAccountMenu(false);
      setShowUserProfile(false);
    };

    if (openMenuId || showAccountMenu || showUserProfile) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId, showAccountMenu, showUserProfile]);

  const handleEditChat = async (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (editingChatId && editingTitle.trim()) {
      try {
        await updateChatTitle({
          sessionId: editingChatId as Id<"chatSessions">,
          title: editingTitle.trim(),
        });
      } catch (error) {
        console.error("Failed to update chat title:", error);
      }
    }
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // If deleting the currently active chat, clear the selection
      if (currentSessionId === chatId) {
        router.push("/chat");
      }
      await deleteChat({ sessionId: chatId as Id<"chatSessions"> });
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingChatId(null);
      setEditingTitle("");
    }
  };

  const handleMobileChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    // Close mobile sidebar after navigation
    if (onMobileToggle) {
      onMobileToggle();
    }
  };

  const handleMobileNewChat = () => {
    router.push("/chat");
    // Close mobile sidebar after navigation
    if (onMobileToggle) {
      onMobileToggle();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden z-50 lg:flex bg-gray-900/50 backdrop-blur-2xl border-r border-gray-700 flex-col max-h-screen transition-all duration-300 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Desktop Header */}
        <div className="border-b-2 border-gray-700 flex items-center justify-center relative group">
          {isCollapsed ? (
            // Collapsed state - just the link icon
            <button
              onClick={() => setIsCollapsed(false)}
              className="m-4 text-lavender-400/80 hover:text-lavender-400  transition-all duration-200 hover:scale-110"
              onMouseEnter={() => setIsLinkHovered(true)}
              onMouseLeave={() => setIsLinkHovered(false)}
            >
              <div className="transition-transform duration-200 ease-out group/header-icon">
                <Link2Off
                  size={24}
                  className="group-hover:-rotate-45 group-hover/header-icon:hidden block transition-transform duration-200 ease-out"
                />
                <Link2
                  size={24}
                  className="-rotate-45 group-hover/header-icon:block hidden transition-transform duration-200 ease-out"
                />
              </div>
            </button>
          ) : (
            // Expanded state - full header
            <div className="p-4 w-full flex items-center justify-between ">
              <Link href="/">
                <h1 className="text-xl group font-medium text-lavender-400 hover:text-white flex items-center transition-colors duration-200">
                  <span
                    className="mx-1 text-lavender-400 group/header-icon transition-transform duration-200 hover:scale-110"
                    onMouseEnter={() => setIsLinkHovered(true)}
                    onMouseLeave={() => setIsLinkHovered(false)}
                  >
                    <Link2
                      size={24}
                      className="rotate-0 group-hover:-rotate-45 group-hover/header-icon:hidden block transition-transform duration-200 ease-out"
                    />
                    <Unlink
                      size={24}
                      className="rotate-0 group-hover/header-icon:block hidden transition-transform duration-200 ease-out"
                    />
                  </span>
                  Ch<span className="text-lavender-400">ai</span>ned
                </h1>
              </Link>
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-gray-400 hover:text-lavender-400 transition-all duration-200 hover:scale-110 hover:rotate-12"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Desktop New Chat Button */}
        <div className="p-4 pb-2 flex justify-center">
          <button
            onClick={() => router.push("/chat")}
            className={`flex items-center text-sm justify-between font-semibold gap-2 p-2.5 bg-lavender-600/80 hover:bg-lavender-600 group text-gray-200 rounded-lg transition-all duration-200 lavender-glow hover:shadow-lavender-500/25 ${
              isCollapsed ? "w-8 h-8 justify-center" : "w-full"
            }`}
          >
            <div className="flex items-center gap-4">
              <LinkIcon
                size={16}
                className={`${isCollapsed ? "text-white block " : "text-gray-200"} transition-transform duration-200 group-hover:hidden block hover:rotate-90`}
              />
              <Unlink
                size={16}
                className={`${isCollapsed ? "text-white block " : "text-gray-200"} transition-transform duration-200 group-hover:block hidden hover:rotate-90`}
              />
              {!isCollapsed && <span>New Chain</span>}
            </div>
          </button>
        </div>

        {/* Desktop Chains Button */}
        <div
          className={`px-4 ${isCollapsed ? "py-2" : " pb-2"} flex justify-center`}
        >
          <button
            onClick={() => router.push("/chains")}
            className={`flex items-center text-sm justify-between font-medium gap-2 p-2.5 bg-gray-800 hover:bg-gray-700 group text-gray-300 hover:text-white rounded-lg transition-all duration-200 ${
              isCollapsed ? "w-8 h-8 justify-center" : "w-full"
            }`}
          >
            <div className="flex items-center gap-4">
              <MessageSquare
                size={16}
                className="transition-transform duration-200 group-hover:scale-110"
              />
              {!isCollapsed && <span>All Chains</span>}
            </div>
          </button>
        </div>

        {/* Desktop Search - Enhanced version */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <div className="relative flex focus:outline-none rounded-lg items-center flex-row text-sm group">
              <div className="p-2.5 rounded-l-lg bg-gray-800 flex items-center pointer-events-none">
                <Search
                  size={16}
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
                placeholder="Search chains..."
                className="w-full p-2 bg-gray-800 rounded-r-lg text-white placeholder-gray-400 focus:outline-none transition-all duration-200 focus:shadow-md outline-none border-r-0"
              />

              {/* Keyboard shortcut hint */}
              {!isSearchFocused && !searchQuery && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Command size={12} />
                    <span>K</span>
                  </div>
                </div>
              )}

              {/* Clear button */}
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search results counter */}
            {searchQuery && (
              <div className="p-2 pb-3 mt-4 border-b border-gray-800/50 text-xs font-semibold hover:text-lavender-400 text-lavender-500 uppercase tracking-wide px-0">
                {filteredChats.length} result
                {filteredChats.length !== 1 ? "s" : ""}
                {filteredChats.length !== (recentChats?.length || 0) && (
                  <span> of {recentChats?.length || 0}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Desktop Chat List */}
        <div
          className={`flex-1 overflow-y-auto scrollbar-none ${
            isCollapsed ? "hidden" : "block"
          }`}
        >
          <div className="px-2">
            {/* Collapsed Search Icon - only show when collapsed and there are chats */}
            {isCollapsed && recentChats && recentChats.length > 0 && (
              <div className="flex justify-center mb-4 pt-2">
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="p-2 text-gray-400 hover:text-lavender-400 transition-all duration-200 hover:scale-110 hover:bg-gray-800/50 rounded-lg group"
                  title="Expand to search chains"
                >
                  <Search
                    size={16}
                    className="group-hover:rotate-12 transition-transform duration-200"
                  />
                </button>
              </div>
            )}

            {recentChats === undefined ? (
              // Loading state
              <LoadingAnimation />
            ) : filteredChats.length === 0 ? (
              // Empty state
              !isCollapsed && (
                <div className="px-2 py-8 text-center">
                  {searchQuery ? (
                    <>
                      <Search
                        size={32}
                        className="mx-auto text-gray-600 mb-2"
                      />
                      <p className="text-sm text-gray-500">No chains found</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Try a different search term
                      </p>
                      <button
                        onClick={clearSearch}
                        className="mt-3 text-xs text-lavender-400/80 hover:text-lavender-400 transition-colors duration-200"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      <MessageSquare
                        size={32}
                        className="mx-auto text-gray-600 mb-2 animate-pulse"
                      />
                      <p className="text-sm text-gray-500">No chains yet</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Create your first chain to get started
                      </p>
                    </>
                  )}
                </div>
              )
            ) : (
              // Grouped chats - use filtered results
              (searchQuery
                ? // Show flat list when searching
                  [{ title: "Search Results", chats: filteredChats }]
                : // Show grouped list when not searching
                  groupChatsByTime(filteredChats)
              ).map((group, groupIndex) => (
                <div
                  key={group.title}
                  className={`${groupIndex > 0 ? "mt-6" : ""}`}
                >
                  {!isCollapsed && !searchQuery && (
                    <h3 className="px-2 py-2 text-xs font-semibold text-lavender-500 uppercase tracking-wide border-b border-gray-800/50 mb-2 transition-colors duration-200 hover:text-lavender-400">
                      {group.title}
                    </h3>
                  )}

                  {/* Collapsed state separator - small visual indicator between groups */}
                  {isCollapsed && groupIndex > 0 && (
                    <div className="flex justify-center py-2 mb-2">
                      {getGroupIcon(group.title)}
                    </div>
                  )}

                  {group.chats.map((chat, chatIndex) => (
                    <div
                      key={chat._id}
                      className={`relative group ${
                        isCollapsed ? "flex justify-center mb-2" : "mb-1"
                      }`}
                    >
                      <button
                        onClick={() => router.push(`/chat/${chat._id}`)}
                        className={`flex relative z-10 items-center text-xs gap-2 group rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${
                          currentSessionId === chat._id
                            ? "bg-lavender-500/20 text-lavender-400 shadow-md shadow-lavender-500/10"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        } ${
                          isCollapsed
                            ? "w-8 h-8 justify-center hover:scale-110"
                            : "w-full px-3 py-2 pr-8"
                        }`}
                      >
                        <LinkIcon
                          size={16}
                          className={`${isCollapsed ? "text-lavender-400/50 block " : "text-gray-400"} transition-transform duration-200 group-hover:hidden block hover:rotate-90`}
                        />
                        <Unlink
                          size={16}
                          className={`${isCollapsed ? "text-lavender-400/50 block " : "text-gray-400"} transition-transform duration-200 group-hover:block hidden hover:rotate-90`}
                        />
                        {!isCollapsed && (
                          <>
                            {editingChatId === chat._id ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(e.target.value)
                                }
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyPress}
                                className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-lavender-400 transition-all duration-200 focus:scale-105"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate flex-1 transition-colors duration-200">
                                <HighlightedText
                                  text={chat.title}
                                  searchQuery={searchQuery}
                                />
                              </span>
                            )}
                          </>
                        )}
                      </button>

                      {/* Three dots menu - only show when expanded */}
                      {!isCollapsed && editingChatId !== chat._id && (
                        <div className="absolute z-50 right-2 top-1/2 transform -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === chat._id ? null : chat._id
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all duration-200 p-1 hover:scale-110 hover:bg-gray-700/50 rounded"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {/* Dropdown menu */}
                          {openMenuId === chat._id && (
                            <div className="absolute right-0 top-0 mt-1 bg-gray-800 border-2 border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                              <button
                                onClick={() =>
                                  handleEditChat(chat._id, chat.title)
                                }
                                className="w-full relative z-50 flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 rounded-t-lg hover:scale-[1.02]"
                              >
                                <Edit2
                                  size={12}
                                  className="transition-transform duration-200 group-hover:scale-110"
                                />
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteChat(chat._id)}
                                className="w-full relative z-50 flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 rounded-b-lg hover:scale-[1.02]"
                              >
                                <Trash2
                                  size={12}
                                  className="transition-transform duration-200 group-hover:scale-110"
                                />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desktop Account Section */}
        <div className="border-t border-gray-800 p-4">
          <div className="relative">
            {isCollapsed ? (
              // Collapsed state - just the user avatar
              <div className="flex justify-center">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox:
                        "w-8 h-8 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-lavender-500/25",
                      userButtonPopoverCard:
                        "bg-gray-800 border border-gray-700",
                      userButtonPopoverActionButton:
                        "text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200",
                      userButtonPopoverActionButtonText: "text-gray-300",
                      userButtonPopoverActionButtonIcon: "text-gray-400",
                    },
                  }}
                />
              </div>
            ) : (
              // Expanded state - full account section
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAccountMenu(!showAccountMenu);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] group"
                >
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          "w-8 h-8 transition-all duration-200 group-hover:scale-110",
                      },
                    }}
                  />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white transition-colors duration-200 group-hover:text-lavender-400">
                      {user?.firstName || user?.username || "User"}{" "}
                      {user?.lastName}
                    </div>
                    <div className="text-xs text-gray-400 transition-colors duration-200 group-hover:text-gray-300">
                      {user?.primaryEmailAddress?.emailAddress}
                    </div>
                  </div>
                  <ChevronUp
                    size={16}
                    className={`text-gray-400 transition-all duration-200 group-hover:text-lavender-400 ${
                      showAccountMenu ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {/* Account Menu Dropdown */}
                {showAccountMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowUserProfile(true);
                          setShowAccountMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200 hover:scale-[1.02] group"
                      >
                        <User
                          size={16}
                          className="text-gray-400 group-hover:text-lavender-400 transition-colors duration-200"
                        />
                        <span>Profile Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          // Handle billing - placeholder for now
                          console.log("Billing clicked");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200 hover:scale-[1.02] group"
                      >
                        <CreditCard
                          size={16}
                          className="text-gray-400 group-hover:text-lavender-400 transition-colors duration-200"
                        />
                        <span>Billing</span>
                      </button>

                      <button
                        onClick={() => {
                          // Handle preferences - placeholder for now
                          console.log("Preferences clicked");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200 hover:scale-[1.02] group"
                      >
                        <Settings
                          size={16}
                          className="text-gray-400 group-hover:text-lavender-400 transition-colors duration-200"
                        />
                        <span>Preferences</span>
                      </button>

                      <div className="border-t border-gray-700 my-1"></div>

                      <SignOutButton>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all duration-200 hover:scale-[1.02] group">
                          <LogOut
                            size={16}
                            className="text-red-400 group-hover:text-red-300 transition-colors duration-200"
                          />
                          <span>Sign Out</span>
                        </button>
                      </SignOutButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-[1000] w-3/4 bg-[#17181D] backdrop-blur-lg border-r border-gray-700/50 flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="border-b border-gray-700/50 flex items-center justify-between p-4 bg-[#17181D] backdrop-blur-sm">
          <Link href="/" onClick={onMobileToggle}>
            <h1 className="text-lg group font-semibold text-lavender-400 flex items-center hover:text-white transition-colors duration-200">
              <span className="mr-2 text-lavender-400">
                <Link2
                  size={20}
                  className="group-hover:-rotate-45 transition-transform duration-200 ease-out"
                />
              </span>
              Ch<span className="text-lavender-400">ai</span>ned
            </h1>
          </Link>
          <button
            onClick={onMobileToggle}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-800/50 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleMobileNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-lavender-500/25"
          >
            <LinkIcon size={16} />
            <span>New Chain</span>
          </button>
        </div>

        {/* Mobile Chains Button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => {
              router.push("/chains");
              if (onMobileToggle) onMobileToggle();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            <MessageSquare size={16} />
            <span>Chains</span>
          </button>
        </div>

        {/* Mobile Search */}
        <div className="px-4 pb-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search
                size={16}
                className={`transition-colors duration-200 ${
                  isSearchFocused ? "text-lavender-400" : "text-gray-400"
                }`}
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search chains..."
              className="w-full pl-10 pr-8 py-3 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lavender-400 focus:ring-1 focus:ring-lavender-400/30 transition-all duration-200 text-sm backdrop-blur-sm"
            />

            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search results counter */}
          {searchQuery && (
            <div className="mt-3 text-xs text-gray-400 px-1 font-medium">
              {filteredChats.length} result
              {filteredChats.length !== 1 ? "s" : ""}
              {filteredChats.length !== (recentChats?.length || 0) && (
                <span className="text-gray-500">
                  {" "}
                  of {recentChats?.length || 0}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Chat List */}
        <div
          className="flex-1 overflow-y-auto px-4 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {recentChats === undefined ? (
            <LoadingAnimation />
          ) : filteredChats.length === 0 ? (
            <div className="py-8 text-center">
              {searchQuery ? (
                <>
                  <Search size={24} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 font-medium">
                    No chains found
                  </p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Try a different search term
                  </p>
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-xs text-lavender-400/80 hover:text-lavender-400 transition-colors duration-200 font-medium"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <MessageSquare
                    size={24}
                    className="mx-auto text-gray-600 mb-3"
                  />
                  <p className="text-sm text-gray-400 font-medium">
                    No chains yet
                  </p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Create your first chain to get started
                  </p>
                </>
              )}
            </div>
          ) : (
            (searchQuery
              ? // Show flat list when searching
                [{ title: "Search Results", chats: filteredChats }]
              : // Show grouped list when not searching
                groupChatsByTime(filteredChats)
            ).map((group, groupIndex) => (
              <div
                key={group.title}
                className={`${groupIndex > 0 ? "mt-6" : ""}`}
              >
                {!searchQuery && (
                  <h3 className="px-3 py-2 text-xs font-bold text-lavender-400 uppercase tracking-wider border-b border-gray-800/50 mb-3 bg-[#17181D] backdrop-blur-sm rounded-t-lg">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.chats.map((chat) => (
                    <div key={chat._id}>
                      <button
                        onClick={() => handleMobileChatClick(chat._id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-sm ${
                          currentSessionId === chat._id
                            ? "bg-lavender-500/20 text-lavender-400 border border-lavender-500/30 shadow-sm"
                            : "text-gray-300 hover:bg-gray-800/60 hover:text-white border border-transparent"
                        }`}
                      >
                        <span className="truncate flex-1 font-medium leading-snug">
                          <HighlightedText
                            text={chat.title}
                            searchQuery={searchQuery}
                          />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mobile Account Section */}
        <div className="border-t border-gray-800/50 p-4 bg-[#17181D] backdrop-blur-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-gray-800 border border-gray-700",
                  userButtonPopoverActionButton:
                    "text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200",
                  userButtonPopoverActionButtonText: "text-gray-300",
                  userButtonPopoverActionButtonIcon: "text-gray-400",
                },
              }}
            />
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white leading-tight">
                {user?.firstName || user?.username || "User"} {user?.lastName}
              </div>
              <div className="text-xs text-gray-400 truncate leading-relaxed">
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UserProfile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative">
            <button
              onClick={() => setShowUserProfile(false)}
              className="absolute -top-4 -right-4 z-[1001] w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              ✕
            </button>
            <UserProfile
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-gray-800 border border-gray-700 shadow-2xl",
                },
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
