import { usePostHog } from "posthog-js/react";

// Custom hooks for analytics tracking
export const useAnalytics = () => {
  const posthog = usePostHog();

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(eventName, {
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_title: document.title,
        user_agent: navigator.userAgent,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        ...properties,
      });
    }
  };

  // Landing page specific events
  const trackLandingPageEvent = {
    // Hero section interactions
    heroViewed: () => trackEvent("landing_hero_viewed"),
    heroCtaClicked: (buttonText: string, location: string) =>
      trackEvent("landing_cta_clicked", {
        button_text: buttonText,
        button_location: location,
        section: "hero",
      }),

    // Feature section interactions
    featureViewed: (featureName: string) =>
      trackEvent("landing_feature_viewed", { feature_name: featureName }),
    featureCtaClicked: (featureName: string) =>
      trackEvent("landing_feature_cta_clicked", { feature_name: featureName }),

    // Access gate interactions
    accessGateOpened: (trigger: string) =>
      trackEvent("access_gate_opened", { trigger }),
    accessGateClosed: () => trackEvent("access_gate_closed"),
    accessGateModeChanged: (mode: "code" | "waitlist") =>
      trackEvent("access_gate_mode_changed", { mode }),
    accessGateBypass: () => trackEvent("access_gate_bypass"),

    // Access code interactions
    accessCodeAttempted: (success: boolean, error?: string) =>
      trackEvent("access_code_attempted", { success, error }),
    accessCodeValidated: (email: string, accessCode?: string) =>
      trackEvent("access_code_validated", {
        email,
        access_code: accessCode,
        user_type: "beta_user",
      }),

    // Waitlist interactions
    waitlistJoined: (email: string, name: string, position: number) =>
      trackEvent("waitlist_joined", {
        email,
        name,
        waitlist_position: position,
      }),
    waitlistError: (error: string) => trackEvent("waitlist_error", { error }),

    // Scroll and engagement tracking
    sectionViewed: (sectionName: string, timeSpent?: number) =>
      trackEvent("landing_section_viewed", {
        section_name: sectionName,
        time_spent_seconds: timeSpent,
      }),
    pageScrolled: (percentage: number) =>
      trackEvent("page_scrolled", { scroll_percentage: percentage }),

    // General interactions
    linkClicked: (linkText: string, linkUrl: string, location: string) =>
      trackEvent("external_link_clicked", {
        link_text: linkText,
        link_url: linkUrl,
        click_location: location,
      }),
    videoPlayed: (videoTitle: string) =>
      trackEvent("demo_video_played", { video_title: videoTitle }),
    videoPaused: (videoTitle: string, timeWatched: number) =>
      trackEvent("demo_video_paused", {
        video_title: videoTitle,
        time_watched_seconds: timeWatched,
      }),

    // User flow events
    userJourney: (step: string, metadata?: Record<string, any>) =>
      trackEvent("user_journey_step", {
        journey_step: step,
        ...metadata,
      }),
  };

  // Performance tracking
  const trackPerformance = () => {
    if ("performance" in window && "getEntriesByType" in performance) {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");

      trackEvent("page_performance", {
        load_time: navigation.loadEventEnd - navigation.loadEventStart,
        dom_content_loaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        first_paint:
          paint.find((p) => p.name === "first-paint")?.startTime || 0,
        first_contentful_paint:
          paint.find((p) => p.name === "first-contentful-paint")?.startTime ||
          0,
      });
    }
  };

  // User identification for beta users
  const identifyUser = (email: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.identify(email, {
        email,
        identified_at: new Date().toISOString(),
        user_type: "beta_user",
        ...properties,
      });
    }
  };

  return {
    trackEvent,
    trackLandingPageEvent,
    trackPerformance,
    identifyUser,
  };
};

// Scroll tracking utility
export const useScrollTracking = () => {
  const { trackLandingPageEvent } = useAnalytics();

  const trackScrollMilestones = () => {
    const milestones = [25, 50, 75, 90, 100];
    const trackedMilestones = new Set<number>();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollPercentage = Math.round(
        (scrollTop / (documentHeight - windowHeight)) * 100
      );

      milestones.forEach((milestone) => {
        if (
          scrollPercentage >= milestone &&
          !trackedMilestones.has(milestone)
        ) {
          trackedMilestones.add(milestone);
          trackLandingPageEvent.pageScrolled(milestone);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  };

  return { trackScrollMilestones };
};

// Section visibility tracking
export const useSectionTracking = () => {
  const { trackLandingPageEvent } = useAnalytics();

  const trackSectionVisibility = (
    sectionName: string,
    elementRef: React.RefObject<HTMLElement>
  ) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackLandingPageEvent.sectionViewed(sectionName);
          }
        });
      },
      { threshold: 0.5 } // Track when 50% of section is visible
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  };

  return { trackSectionVisibility };
};
