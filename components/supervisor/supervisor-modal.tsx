"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { ChainProgress } from "../performance/chain-progress";
import { SupervisorConversationContent } from "./supervisor-conversation-content";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Bot,
  User,
  Maximize2,
  Minimize2,
  X,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Link2,
} from "lucide-react";

interface SupervisorModalProps {
  sessionId: Id<"chatSessions">;
  isOpen: boolean;
  onToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTyping: boolean;
  supervisorStatus: "idle" | "thinking" | "orchestrating" | "ready";
  supervisorStreamContent?: { [turnId: string]: string };
}

const MODAL_BOTTOM_OFFSET = "bottom-[110px] md:bottom-[150px]";

export function SupervisorModal({
  sessionId,
  isOpen,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
  isTyping,
  supervisorStatus,
  supervisorStreamContent = {},
}: SupervisorModalProps) {
  const supervisorTurns = useQuery(api.queries.getSupervisorTurns, {
    sessionId,
  });

  const agentSteps = useQuery(api.queries.getAgentSteps, {
    sessionId,
  });

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        onToggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  const getStatusText = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "Supervisor thinking...";
      case "orchestrating":
        return "Orchestrating agents...";
      case "ready":
        return "Ready";
      default:
        return "Supervisor available";
    }
  };

  const getStatusColor = () => {
    switch (supervisorStatus) {
      case "thinking":
        return "text-yellow-400";
      case "orchestrating":
        return "text-blue-400";
      case "ready":
        return "text-emerald-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <LayoutGroup>
      <AnimatePresence mode="wait">
        {isFullscreen ? (
          <motion.div
            key="fullscreen"
            layoutId="supervisor-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed inset-0 z-30 bg-gray-950/95 backdrop-blur-sm"
          >
            <motion.div
              className="h-full flex flex-col"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Fullscreen Header */}
              <motion.div
                className="flex-shrink-0 px-6 py-4 bg-gray-950/95 backdrop-blur-sm border-b border-gray-700/50"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm text-lavender-400 font-medium">
                      Supervisor
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onToggleFullscreen}
                      className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                      title="Exit fullscreen"
                    >
                      <Minimize2 className="w-4 h-4 text-gray-400 hover:text-white" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onToggle}
                      className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-white" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Fullscreen Content */}
              <motion.div
                className="flex-1 overflow-y-auto"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <SupervisorConversationContent
                  supervisorTurns={supervisorTurns}
                  supervisorStreamContent={supervisorStreamContent}
                  agentSteps={agentSteps}
                  useMotion={true}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        ) : isOpen ? (
          <div
            className={`absolute ${MODAL_BOTTOM_OFFSET} left-0 right-0 flex justify-center pb-4 px-6 z-30 pointer-events-none`}
          >
            <motion.div
              key="modal"
              layoutId="supervisor-modal"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                y: 50,
                scale: 0.95,
                transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
              }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
                layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              }}
              className="w-full max-w-4xl bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-xl shadow-2xl shadow-gray-950/50 pointer-events-auto overflow-hidden"
            >
              {/* Modal Header */}
              <motion.div
                className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <Link2 className="w-4 h-4 text-lavender-400" />
                  <span className="text-xs text-lavender-400 font-medium">
                    Supervisor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggleFullscreen}
                    className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                    title="Expand to fullscreen"
                  >
                    <Maximize2 className="w-3 h-3 text-gray-400 hover:text-white" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggle}
                    className="p-1.5 hover:bg-gray-800/50 rounded transition-colors"
                    title="Collapse"
                  >
                    <ChevronDown className="w-3 h-3 text-gray-400 hover:text-white" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Modal Content */}
              <motion.div
                className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-dark"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  transition: {
                    height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2, delay: 0.1 },
                  },
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                    opacity: { duration: 0.1 },
                  },
                }}
              >
                <SupervisorConversationContent
                  supervisorTurns={supervisorTurns}
                  supervisorStreamContent={supervisorStreamContent}
                  agentSteps={agentSteps}
                  useMotion={true}
                />
              </motion.div>
            </motion.div>
          </div>
        ) : (
          // Status indicator when modal is closed
          <div
            className={`absolute ${MODAL_BOTTOM_OFFSET} left-0 right-0 flex justify-center px-4 pb-2 z-30`}
          >
            <motion.button
              key="status-bar"
              layoutId="supervisor-modal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={onToggle}
              className="flex justify-between shadow-lg shadow-gray-950/50 items-center gap-3 px-4 py-2 bg-gray-900/85 backdrop-blur-sm border max-w-4xl w-full border-gray-600/50 rounded-xl text-sm transition-all duration-300 hover:bg-gray-800/90 hover:border-emerald-400/30 group"
            >
              <div className="flex items-center gap-3">
                <Link2 className="w-4 h-4 text-lavender-400" />
                <span className="text-xs text-lavender-400 font-medium">
                  Supervisor
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                </motion.div>
              </div>
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
