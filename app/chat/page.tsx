"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  Authenticated,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Sidebar } from "../../components/layout/sidebar";
import { MobileSidebarToggle } from "../../components/MobileSidebarToggle";
import { WelcomeScreen } from "../../components/core/welcome-screen";
import { InputAreaContainer } from "@/components/input/input-area-container";
import { PerformanceProvider } from "../../lib/performance-context";
import { useSidebar } from "../../lib/sidebar-context";
import Beams from "@/components/Backgrounds/Beams/Beams";
import type { Agent } from "../../components/core/agent-input";

// Beams Background Component
const BeamsBackground = () => {
  return (
    <motion.div
      className="absolute inset-0 z-0 rounded-tl-2xl overflow-hidden "
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 3,
        delay: 0.5,
        ease: "easeInOut",
      }}
    >
      <Beams
        beamWidth={2}
        beamHeight={20}
        beamNumber={15}
        lightColor="#c4b5fd"
        speed={3}
        noiseIntensity={1.5}
        scale={0.12}
        rotation={15}
      />
    </motion.div>
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
  const { isCollapsed } = useSidebar();

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
    <div className="flex h-auto bg-neutral-950 relative overflow-hidden scrollbar-none">
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
      <div
        className={`flex-1 flex flex-col relative w-full transition-all border-l-2 border-lavender-400/30 duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${!isCollapsed ? "mt-4 ml-2  rounded-tl-2xl  border-t-2 shadow-2xl" : "rounded-tl-none"}`}
      >
        {/* Welcome Screen - only show if no preset agents are loaded */}
        {!presetAgents && (
          <div className="flex-1 flex items-center justify-center w-full ">
            {/* Beams Background */}
            <BeamsBackground />
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
  const { user } = useUser();

  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center bg-gray-900/50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Welcome to Chained Chat
            </h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access the chat functionality
            </p>

            {/* Debug info */}
            {user && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600/50 rounded-lg">
                <p className="text-yellow-400 text-sm mb-2">
                  Debug: Clerk shows you're signed in as{" "}
                  {user.emailAddresses?.[0]?.emailAddress}
                </p>
                <p className="text-yellow-400 text-xs">
                  But Convex authentication is not working. Try signing out and
                  back in.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                  Sign In
                </button>
              </SignInButton>

              {user && (
                <SignOutButton>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
                    Sign Out & Reset
                  </button>
                </SignOutButton>
              )}
            </div>
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
