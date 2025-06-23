"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  Authenticated,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Sidebar } from "../../components/chat/sidebar";
import { MobileSidebarToggle } from "../../components/MobileSidebarToggle";
import { WelcomeScreen } from "../../components/chat/welcome-screen";
import { InputAreaContainer } from "@/components/input/input-area-container";
import { PerformanceProvider } from "../../lib/performance-context";
import type { Agent } from "../../components/input/agent-input";

// Subtle Grid Animation Component
const SubtleGridBackground = () => {
  return (
    <motion.div
      className="absolute inset-0 opacity-[0.25] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(147,112,219,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147,112,219,0.4) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        filter: "blur(0.5px)",
      }}
      animate={{
        backgroundPosition: ["0px 0px", "60px 60px", "0px 0px"],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

function ChatLandingContent() {
  const router = useRouter();
  const createSession = useMutation(api.mutations.createSession);
  const recentChats = useQuery(api.queries.getChatSessions);
  const [presetAgents, setPresetAgents] = useState<Agent[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [queuedAgents, setQueuedAgents] = useState<Agent[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Only show sidebar if there are chats to display
  const shouldShowSidebar = recentChats && recentChats.length > 0;

  const handleLoadPreset = async (agents: Agent[]) => {
    try {
      // Instead of creating a session immediately, just load the preset into the input area
      setPresetAgents(agents);
    } catch (error) {
      console.error("Failed to load preset:", error);
    }
  };

  const handleSendChain = async (agents: Agent[]) => {
    try {
      // Create a new session for the chain and redirect to it
      const firstPrompt = agents[0]?.prompt || "";
      const title =
        firstPrompt.length > 0
          ? `${firstPrompt.split(" ").slice(0, 3).join(" ")}...`
          : `Chat with ${agents.length} agents`;

      const sessionId = await createSession({
        title,
      });

      // Store the agents in localStorage to be picked up by the dynamic route
      localStorage.setItem(
        `pending-agents-${sessionId}`,
        JSON.stringify(agents)
      );

      // Redirect to the new session
      router.push(`/chat/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleClearPresetAgents = () => {
    setPresetAgents(null);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-950 relative overflow-hidden">
      {/* Subtle Grid Background */}
      <SubtleGridBackground />

      {/* Only render sidebar if there are chats */}
      {shouldShowSidebar && (
        <Sidebar
          currentSessionId={undefined}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={toggleMobileSidebar}
        />
      )}
      {/* Only render mobile toggle if there are chats */}
      {shouldShowSidebar && (
        <MobileSidebarToggle
          isOpen={isMobileSidebarOpen}
          onToggle={toggleMobileSidebar}
        />
      )}
      <div className="flex-1 flex flex-col relative w-full">
        {/* Welcome Screen - only show if no preset agents are loaded */}
        {!presetAgents && (
          <div className="flex-1 flex items-center justify-center w-full bg-gray-950/70">
            <WelcomeScreen onLoadPreset={handleLoadPreset} />
          </div>
        )}

        {/* Input Area */}
        <InputAreaContainer
          mode="initial"
          onSendChain={handleSendChain}
          presetAgents={presetAgents}
          onClearPresetAgents={handleClearPresetAgents}
          isLoading={isLoading}
          isStreaming={isStreaming}
          queuedAgents={queuedAgents}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center bg-gray-900/50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Welcome to Chain Chat
            </h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access the chat functionality
            </p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <PerformanceProvider>
          <ChatLandingContent />
        </PerformanceProvider>
      </Authenticated>
    </>
  );
}
