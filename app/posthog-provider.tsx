"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Patch fetch to gracefully handle aborted requests
    const originalFetch = window.fetch;
    window.fetch = function patchedFetch(input, init) {
      // Check if this is a PostHog request
      const isPostHogRequest =
        (typeof input === "string" && input.includes("posthog")) ||
        (input instanceof Request && input.url.includes("posthog")) ||
        (typeof input === "string" && input.includes("/ingest"));

      const promise = originalFetch(input, init);

      // Enhanced error handling for PostHog requests
      return promise.catch((error) => {
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          if (isPostHogRequest) {
            // Silently absorb PostHog AbortErrors
            console.debug("PostHog fetch request aborted, suppressing error");
            // Return an empty, successful response to prevent error propagation
            return new Response(JSON.stringify({ status: "ok" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        // Re-throw all non-PostHog errors
        throw error;
      });
    };

    // Add comprehensive global error handlers for PostHog-related errors
    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      const messageStr = String(message || "");
      const sourceStr = String(source || "");

      if (
        error?.name === "AbortError" ||
        messageStr.includes("aborted") ||
        messageStr.includes("posthog") ||
        sourceStr.includes("posthog") ||
        sourceStr.includes("ingest")
      ) {
        // Suppress PostHog-related errors
        console.debug("Suppressed PostHog error:", message);
        return true; // Prevents the error from bubbling up
      }
      // Call original handler for other errors
      return originalOnError
        ? originalOnError(message, source, lineno, colno, error)
        : false;
    };

    // Add unhandledrejection handler for Promise-based PostHog errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason?.message || reason || "");

      if (
        reason?.name === "AbortError" ||
        reasonStr.includes("aborted") ||
        reasonStr.includes("posthog") ||
        reasonStr.includes("ingest")
      ) {
        // Suppress PostHog-related promise rejections
        console.debug("Suppressed PostHog promise rejection:", reason);
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      capture_pageview: false, // We capture pageviews manually
      capture_pageleave: true, // Enable pageleave capture
      capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
      debug: process.env.NODE_ENV === "development",
      bootstrap: {
        distinctID: "anonymous_user",
        isIdentifiedID: false,
      },
      // Add additional options to make PostHog more resilient
      autocapture: false, // Disable autocapture which can cause more network requests
      disable_session_recording: true, // Disable session recording to reduce network requests
    });

    // Return cleanup function to restore original fetch and error handlers
    return () => {
      window.fetch = originalFetch;
      window.onerror = originalOnError;
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      try {
        let url = window.origin + pathname;
        const search = searchParams.toString();
        if (search) {
          url += "?" + search;
        }

        // Use a controller to allow aborting this request when component unmounts
        const controller = new AbortController();
        const signal = controller.signal;

        // Use a safe wrapper for posthog.capture
        const capturePromise = Promise.resolve()
          .then(() => {
            if (!signal.aborted) {
              posthog.capture("$pageview", { $current_url: url });
            }
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.debug("Suppressed PostHog pageview error:", err);
            }
          });

        // Cleanup function to abort requests on unmount
        return () => {
          controller.abort();
        };
      } catch (error) {
        console.debug("Error in PostHog pageview tracking:", error);
      }
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
