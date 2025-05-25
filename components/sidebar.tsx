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
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Id } from "../convex/_generated/dataModel";
import Link from "next/link";

interface SidebarProps {
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  currentSessionId?: string;
}

export function Sidebar({
  onNewChat,
  onSelectChat,
  currentSessionId,
}: SidebarProps) {
  const recentChats = useQuery(api.queries.getRecentChats);
  const updateChatTitle = useMutation(api.mutations.updateChatTitle);
  const deleteChat = useMutation(api.mutations.deleteChat);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

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
      onSelectChat("");
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

  return (
    <div
      className={`bg-gray-900 border-r border-gray-800 flex flex-col h-full transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="border-b-2 border-gray-700 flex items-center justify-center relative">
        {isCollapsed ? (
          // Collapsed state - just the link icon
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-4 text-lavender-400 hover:text-lavender-300 transition-colors"
            onMouseEnter={() => setIsLinkHovered(true)}
            onMouseLeave={() => setIsLinkHovered(false)}
          >
            {isLinkHovered ? <Link2 size={24} /> : <Link2Off size={24} />}
          </button>
        ) : (
          // Expanded state - full header
          <div className="p-4 w-full flex items-center justify-between">
            <Link href="/">
              <h1 className="text-xl font-bold text-white flex items-center">
                Chained
                <span
                  className="mx-1 text-lavender-400"
                  onMouseEnter={() => setIsLinkHovered(true)}
                  onMouseLeave={() => setIsLinkHovered(false)}
                >
                  {isLinkHovered ? <Link2Off size={24} /> : <Link2 size={24} />}
                </span>
              </h1>
            </Link>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-gray-400 hover:text-lavender-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4 flex justify-center">
        <button
          onClick={onNewChat}
          className={`flex items-center gap-2 px-3 py-2 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg transition-colors lavender-glow ${
            isCollapsed ? "w-8 h-8 justify-center" : "w-full"
          }`}
        >
          <Plus size={16} />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Search - Only show when expanded */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <input
            type="text"
            placeholder="Search your threads..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lavender-400"
          />
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          {!isCollapsed && (
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Recent
            </h3>
          )}
          {recentChats?.map((chat) => (
            <div
              key={chat._id}
              className={`relative group ${
                isCollapsed ? "flex justify-center mb-2" : "mb-1"
              }`}
            >
              <button
                onClick={() => onSelectChat(chat._id)}
                className={`flex relative z-10 items-center gap-2 rounded-lg text-left transition-colors ${
                  currentSessionId === chat._id
                    ? "bg-lavender-500/20 text-lavender-400"
                    : "text-gray-300 hover:bg-gray-800"
                } ${
                  isCollapsed
                    ? "w-8 h-8 justify-center"
                    : "w-full px-3 py-2 pr-8"
                }`}
              >
                <MessageSquare size={16} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    {editingChatId === chat._id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lavender-400"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate flex-1">{chat.title}</span>
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
                      setOpenMenuId(openMenuId === chat._id ? null : chat._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all duration-200 p-1"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Dropdown menu */}
                  {openMenuId === chat._id && (
                    <div className="absolute right-0 top-0 mt-1 bg-gray-800 border-2 border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]">
                      <button
                        onClick={() => handleEditChat(chat._id, chat.title)}
                        className="w-full relative z-50 flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg"
                      >
                        <Edit2 size={12} />
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteChat(chat._id)}
                        className="w-full relative z-50 flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-b-lg"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
