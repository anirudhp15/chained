/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Rewrites to support PostHog
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    // More permissive CSP for development to avoid CAPTCHA issues
    const devCSP = [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *",
      "style-src 'self' 'unsafe-inline' *",
      "img-src 'self' data: blob: *",
      "connect-src 'self' data: blob: *",
      "font-src 'self' data: *",
      "media-src 'self' data: blob: *",
      "frame-src 'self' *",
      "worker-src 'self' blob: *",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' *",
    ].join("; ");

    // Production CSP with specific domains - more permissive for reCAPTCHA
    const prodCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.posthog.com *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com img.clerk.com https://www.gstatic.com https://www.google.com https://*.gstatic.com https://*.google.com https://*.recaptcha.net https://*.googletagmanager.com worker.clerkprod-cloudflare.net clerk.services 'wasm-unsafe-eval'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com https://*.gstatic.com https://*.google.com",
      "img-src 'self' data: blob: *.amazonaws.com *.convex.cloud *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com img.clerk.com *.clerk.services https://*.gstatic.com https://*.google.com https://*.googleusercontent.com",
      "connect-src 'self' *.convex.cloud *.posthog.com *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com accounts.google.com github.com api.github.com www.linkedin.com https://*.google.com https://*.recaptcha.net https://*.googletagmanager.com https://*.gstatic.com worker.clerkprod-cloudflare.net clerk.services wss:",
      "font-src 'self' fonts.gstatic.com https://*.google.com",
      "media-src 'self' blob:",
      "frame-src 'self' https://*.google.com https://*.recaptcha.net https://*.gstatic.com *.clerk.com clerk.chained.chat",
      "child-src 'self' https://*.google.com https://*.recaptcha.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' accounts.google.com github.com www.linkedin.com *.clerk.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isDev ? devCSP : prodCSP,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Download-Options",
            value: "noopen",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
