import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimiters } from "./lib/rate-limiter";
import { generateRateLimitKey } from "./lib/api-validation";

const isProtectedRoute = createRouteMatcher(["/chat(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);
const isLLMRoute = createRouteMatcher([
  "/api/run-chain",
  "/api/stream-agent",
  "/api/stream-parallel",
]);
const isUploadRoute = createRouteMatcher(["/api/upload-file"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Add CORS headers for API routes
  if (isApiRoute(req)) {
    const origin = req.headers.get("origin");
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [process.env.NEXT_PUBLIC_APP_URL || "https://chained.chat"]
        : [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3002",
          ];

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, DELETE"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    // Rate limiting for API routes
    const rateLimitKey = generateRateLimitKey(req);
    let rateLimit;

    // Apply different rate limits based on route type
    // Skip rate limiting for LLM routes to enable parallel execution
    // TODO: Implement session-based rate limiting for parallel agents
    if (isLLMRoute(req)) {
      // Skip middleware rate limiting for LLM routes - handle in route handler instead
      rateLimit = {
        success: true,
        limit: 100,
        remaining: 100,
        reset: Date.now() + 60000,
      };
    } else if (isUploadRoute(req)) {
      rateLimit = await rateLimiters.upload.checkRateLimit(rateLimitKey);
    } else {
      rateLimit = await rateLimiters.general.checkRateLimit(rateLimitKey);
    }

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-XSS-Protection": "1; mode=block",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimit.remaining.toString()
    );
    response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());

    // Validate request size for API routes
    const contentLength = req.headers.get("content-length");
    const maxSize = isUploadRoute(req) ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for uploads, 10MB for others

    if (contentLength && parseInt(contentLength) > maxSize) {
      return new Response(
        JSON.stringify({
          error: "Request too large",
          message: `Maximum request size: ${maxSize / 1024 / 1024}MB`,
        }),
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-XSS-Protection": "1; mode=block",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          },
        }
      );
    }
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();

    // Additional check for beta access
    const { userId } = await auth();

    if (userId) {
      // Check if user has beta access stored in a cookie or if they have valid access
      const betaAccess = req.cookies.get("chained_beta_access");

      // TEMPORARILY DISABLED: Allow all authenticated users access
      // TODO: Re-enable beta access protection when needed
      /*
      if (!betaAccess) {
        // Redirect to landing page if no beta access
        const url = new URL("/", req.url);
        return NextResponse.redirect(url);
      }
      */
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
