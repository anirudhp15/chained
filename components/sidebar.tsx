"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  Plus,
  MessageSquare,
  Link2,
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
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Id } from "../convex/_generated/dataModel";
import Link from "next/link";
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

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen && onMobileToggle) {
        onMobileToggle();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, onMobileToggle]);

  const handleEditChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (editingChatId && editingTitle.trim()) {
      await updateChatTitle({
        sessionId: editingChatId as Id<"chatSessions">,
        title: editingTitle.trim(),
      });
    }
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleDeleteChat = async (chatId: string) => {
    // If deleting the currently active chat, clear the selection
    if (currentSessionId === chatId) {
      router.push("/chat");
    }
    await deleteChat({ sessionId: chatId as Id<"chatSessions"> });
    setOpenMenuId(null);
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

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex bg-gray-900/90 border-r border-gray-700 flex-col h-full transition-all duration-300 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Desktop Header */}
        <div className="border-b-2 border-gray-700 flex items-center justify-center relative">
          {isCollapsed ? (
            // Collapsed state - just the link icon
            <button
              onClick={() => setIsCollapsed(false)}
              className="m-4 text-lavender-400 hover:text-lavender-300 transition-all duration-200 hover:scale-110"
              onMouseEnter={() => setIsLinkHovered(true)}
              onMouseLeave={() => setIsLinkHovered(false)}
            >
              <div className="transition-transform duration-200 ease-out">
                <Link2Off
                  size={24}
                  className="hover:-rotate-45 -rotate-12 transition-transform duration-200 ease-out"
                />
              </div>
            </button>
          ) : (
            // Expanded state - full header
            <div className="p-4 w-full flex items-center justify-between">
              <Link href="/">
                <h1 className="text-xl font-medium text-white flex items-center hover:text-lavender-300 transition-colors duration-200">
                  <span
                    className="mx-1 text-lavender-400 transition-transform duration-200 hover:scale-110"
                    onMouseEnter={() => setIsLinkHovered(true)}
                    onMouseLeave={() => setIsLinkHovered(false)}
                  >
                    <Link2
                      size={24}
                      className="rotate-0 hover:-rotate-45 transition-transform duration-200 ease-out"
                    />
                  </span>
                  Chained
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
        <div className="p-4 flex justify-center">
          <button
            onClick={() => router.push("/chat")}
            className={`flex items-center justify-center font-bold gap-2 px-3 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-all duration-200 lavender-glow hover:scale-105 hover:shadow-lavender-500/25 ${
              isCollapsed ? "w-8 h-8 justify-center" : "w-full"
            }`}
          >
            <Plus
              className={`${isCollapsed ? "text-white block text-4xl" : "hidden"} transition-transform duration-200 hover:rotate-90`}
            />
            {!isCollapsed && <span>New Chain</span>}
          </button>
        </div>

        {/* Desktop Search - Only show when expanded */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <input
              type="text"
              placeholder="Search your chains..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lavender-400 transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:shadow-lavender-500/10"
            />
          </div>
        )}

        {/* Desktop Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-2">
            {recentChats === undefined ? (
              // Loading state
              <LoadingAnimation />
            ) : recentChats.length === 0 ? (
              // Empty state
              !isCollapsed && (
                <div className="px-2 py-8 text-center">
                  <MessageSquare
                    size={32}
                    className="mx-auto text-gray-600 mb-2 animate-pulse"
                  />
                  <p className="text-sm text-gray-500">No chains yet</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Create your first chain to get started
                  </p>
                </div>
              )
            ) : (
              // Grouped chats
              groupChatsByTime(recentChats).map((group, groupIndex) => (
                <div
                  key={group.title}
                  className={`${groupIndex > 0 ? "mt-6" : ""}`}
                >
                  {!isCollapsed && (
                    <h3 className="px-2 py-2 text-xs font-semibold text-lavender-500 uppercase tracking-wide border-b border-gray-800/50 mb-2 transition-colors duration-200 hover:text-lavender-400">
                      {group.title}
                    </h3>
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
                        className={`flex relative z-10 items-center text-xs gap-2 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${
                          currentSessionId === chat._id
                            ? "bg-lavender-500/20 text-lavender-400 shadow-md shadow-lavender-500/10"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        } ${
                          isCollapsed
                            ? "w-8 h-8 justify-center hover:scale-110"
                            : "w-full px-3 py-2 pr-8"
                        }`}
                      >
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
                                {chat.title}
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
                    <div className="text-sm font-medium text-white transition-colors duration-200 group-hover:text-lavender-300">
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
        className={`fixed inset-y-0 left-0 z-50 w-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="border-b border-gray-700 flex items-center justify-between p-3">
          <Link href="/" onClick={onMobileToggle}>
            <h1 className="text-lg font-medium text-white flex items-center hover:text-lavender-300 transition-colors duration-200">
              <span className="mr-2 text-lavender-400">
                <Link2
                  size={20}
                  className="hover:-rotate-45 transition-transform duration-200 ease-out"
                />
              </span>
              Chained
            </h1>
          </Link>
          <button
            onClick={onMobileToggle}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleMobileNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            <Plus size={16} />
            <span>New Chain</span>
          </button>
        </div>

        {/* Mobile Chat List */}
        <div className="flex-1 overflow-y-auto px-3">
          {recentChats === undefined ? (
            <LoadingAnimation />
          ) : recentChats.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare size={24} className="mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">No chains yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Create your first chain to get started
              </p>
            </div>
          ) : (
            groupChatsByTime(recentChats).map((group, groupIndex) => (
              <div
                key={group.title}
                className={`${groupIndex > 0 ? "mt-4" : ""}`}
              >
                <h3 className="px-2 py-1 text-xs font-semibold text-lavender-500 uppercase tracking-wide border-b border-gray-800/50 mb-2">
                  {group.title}
                </h3>
                {group.chats.map((chat) => (
                  <div key={chat._id} className="mb-1">
                    <button
                      onClick={() => handleMobileChatClick(chat._id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 text-xs ${
                        currentSessionId === chat._id
                          ? "bg-lavender-500/20 text-lavender-400"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Mobile Account Section */}
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-6 h-6",
                  userButtonPopoverCard: "bg-gray-800 border border-gray-700",
                  userButtonPopoverActionButton:
                    "text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200",
                  userButtonPopoverActionButtonText: "text-gray-300",
                  userButtonPopoverActionButtonIcon: "text-gray-400",
                },
              }}
            />
            <div className="flex-1 text-left">
              <div className="text-xs font-medium text-white">
                {user?.firstName || user?.username || "User"} {user?.lastName}
              </div>
              <div className="text-xs text-gray-400 truncate">
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
