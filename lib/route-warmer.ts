/**
 * ⚡ PERFORMANCE: Route Warming Service
 * Prevents cold starts by keeping critical routes warm
 * Industry best practice for Next.js LLM applications (Summer 2025)
 */

interface WarmingConfig {
  interval: number; // milliseconds
  routes: string[];
  retryAttempts: number;
}

export class RouteWarmer {
  private static warmingInterval: NodeJS.Timeout | null = null;
  private static isWarming = false;

  private static readonly DEFAULT_CONFIG: WarmingConfig = {
    interval: 4 * 60 * 1000, // 4 minutes
    routes: [
      "/api/run-chain",
      "/api/stream-parallel",
      "/api/supervisor-interact",
    ],
    retryAttempts: 3,
  };

  /**
   * Starts warming critical routes to prevent cold starts
   * Should be called on app initialization
   */
  static startWarming(config: Partial<WarmingConfig> = {}) {
    if (this.isWarming) {
      console.log("🔥 Route warmer already running");
      return;
    }

    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    this.isWarming = true;

    console.log(
      `🔥 Starting route warmer for ${finalConfig.routes.length} routes`
    );
    console.log(`🔥 Warming interval: ${finalConfig.interval / 1000}s`);

    // Initial warm-up
    this.warmRoutes(finalConfig.routes, finalConfig.retryAttempts);

    // Set up periodic warming
    this.warmingInterval = setInterval(() => {
      this.warmRoutes(finalConfig.routes, finalConfig.retryAttempts);
    }, finalConfig.interval);
  }

  /**
   * Stops the route warming service
   */
  static stopWarming() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      this.isWarming = false;
      console.log("🔥 Route warmer stopped");
    }
  }

  /**
   * Manually warm specific routes
   */
  static async warmRoutes(routes: string[], retryAttempts = 3) {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    console.log(`🔥 Warming ${routes.length} routes...`);

    const warmPromises = routes.map((route) =>
      this.warmRoute(`${baseUrl}${route}`, retryAttempts)
    );

    try {
      await Promise.allSettled(warmPromises);
      console.log("🔥 Route warming completed");
    } catch (error) {
      console.warn("🔥 Some routes failed to warm:", error);
    }
  }

  /**
   * Warm a single route with retry logic
   */
  private static async warmRoute(
    url: string,
    retryAttempts: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
          method: "OPTIONS", // Lightweight warming request
          headers: {
            "x-warmup": "true",
            "x-warmup-attempt": attempt.toString(),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 405) {
          // 405 is fine for OPTIONS
          console.log(`🔥 Warmed: ${url} (attempt ${attempt})`);
          return;
        }
      } catch (error) {
        console.warn(
          `🔥 Failed to warm ${url} (attempt ${attempt}):`,
          error instanceof Error ? error.message : error
        );

        if (attempt === retryAttempts) {
          console.error(
            `🔥 Route warming failed after ${retryAttempts} attempts: ${url}`
          );
        } else {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
  }

  /**
   * Get warming status
   */
  static getStatus() {
    return {
      isWarming: this.isWarming,
      hasInterval: this.warmingInterval !== null,
    };
  }
}

// Auto-start removed to prevent conflicts with React initialization
// Use RouteWarmerInitializer component instead
