"use client";

import { useEffect } from "react";
import { RouteWarmer } from "../lib/route-warmer";

/**
 * ⚡ PERFORMANCE: Route Warmer Initializer
 * Starts route warming service to prevent cold starts
 * Must be a client component since route warming uses fetch()
 */
export function RouteWarmerInitializer() {
  useEffect(() => {
    // Only start warming in development or production (not during SSR)
    if (typeof window !== "undefined") {
      console.log("🔥 Initializing route warmer...");

      // Start warming with optimized config for LLM app
      RouteWarmer.startWarming({
        interval: 3 * 60 * 1000, // 3 minutes for active development
        routes: [
          "/api/run-chain",
          "/api/stream-parallel",
          "/api/supervisor-interact",
          "/api/stream-agent",
        ],
        retryAttempts: 2,
      });

      // Cleanup on unmount
      return () => {
        RouteWarmer.stopWarming();
      };
    }
  }, []);

  // This component renders nothing - it's just for side effects
  return null;
}
