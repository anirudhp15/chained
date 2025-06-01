interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple memory-based rate limiter for MVP (upgrade to Redis later)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();

    // Clean up old entries
    Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    });

    const entry = rateLimitMap.get(identifier);

    if (!entry || entry.resetTime < now) {
      // New window
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + this.options.interval,
      });

      return {
        success: true,
        limit: this.options.uniqueTokenPerInterval,
        remaining: this.options.uniqueTokenPerInterval - 1,
        reset: now + this.options.interval,
      };
    }

    if (entry.count >= this.options.uniqueTokenPerInterval) {
      return {
        success: false,
        limit: this.options.uniqueTokenPerInterval,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    entry.count++;

    return {
      success: true,
      limit: this.options.uniqueTokenPerInterval,
      remaining: this.options.uniqueTokenPerInterval - entry.count,
      reset: entry.resetTime,
    };
  }
}

// Rate limit configurations
export const rateLimiters = {
  // General API endpoints
  general: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  }),

  // LLM endpoints (expensive)
  llm: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 LLM calls per minute
  }),

  // File upload endpoints
  upload: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 20, // 20 uploads per minute
  }),

  // Free tier specific limits
  freeTier: new RateLimiter({
    interval: 24 * 60 * 60 * 1000, // 24 hours
    uniqueTokenPerInterval: 50, // 50 chains per day
  }),

  // Pro tier limits (generous)
  proTier: new RateLimiter({
    interval: 24 * 60 * 60 * 1000, // 24 hours
    uniqueTokenPerInterval: 1000, // 1000 chains per day
  }),
};

export async function checkUserTierLimits(
  userId: string,
  tier: "free" | "pro"
): Promise<RateLimitResult> {
  if (tier === "pro") {
    // Pro users get generous limits
    return await rateLimiters.proTier.checkRateLimit(`user:${userId}`);
  }

  // Free users get daily limits
  return await rateLimiters.freeTier.checkRateLimit(`user:${userId}`);
}

// Cleanup function to prevent memory leaks
export function cleanupRateLimitMap() {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  });
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
