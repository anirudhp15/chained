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

  // ⚡ PERFORMANCE: Next.js 15 optimizations for LLM applications
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "@clerk/nextjs",
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-icons",
      "react-icons",
    ],
  },

  // External packages for server components (moved from experimental)
  serverExternalPackages: ["convex"],

  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Webpack optimizations for faster builds and smaller bundles
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Split chunks more aggressively for better caching
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: "all",
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate vendor chunks for better caching
          clerk: {
            name: "clerk",
            test: /[\\/]node_modules[\\/]@clerk[\\/]/,
            priority: 30,
            chunks: "all",
          },
          ui: {
            name: "ui",
            test: /[\\/]node_modules[\\/](lucide-react|framer-motion|@radix-ui)[\\/]/,
            priority: 25,
            chunks: "all",
          },
        },
      };
    }

    return config;
  },

  // Enable compression and optimization
  compress: true,
  poweredByHeader: false,

  // Image optimization for better performance
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
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

    // Production CSP with specific domains - fully permissive for reCAPTCHA
    const prodCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.posthog.com *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com img.clerk.com clerk.chained.chat https://challenges.cloudflare.com https://www.gstatic.com https://www.google.com https://*.gstatic.com https://*.google.com https://*.recaptcha.net https://recaptcha.google.com https://www.googletagmanager.com https://*.googletagmanager.com worker.clerkprod-cloudflare.net clerk.services 'wasm-unsafe-eval'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com https://*.gstatic.com https://*.google.com https://recaptcha.google.com clerk.chained.chat",
      "img-src 'self' data: blob: *.amazonaws.com *.convex.cloud *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com img.clerk.com *.clerk.services clerk.chained.chat https://*.gstatic.com https://*.google.com https://*.googleusercontent.com https://recaptcha.google.com",
      "connect-src 'self' *.convex.cloud *.posthog.com *.clerk.accounts.dev *.clerk.dev *.chained.chat *.clerk.com clerk.chained.chat accounts.google.com github.com api.github.com www.linkedin.com https://*.google.com https://*.recaptcha.net https://recaptcha.google.com https://*.googletagmanager.com https://*.gstatic.com worker.clerkprod-cloudflare.net clerk.services wss:",
      "font-src 'self' fonts.gstatic.com https://*.google.com",
      "media-src 'self' blob:",
      "frame-src 'self' https://challenges.cloudflare.com https://*.google.com https://*.recaptcha.net https://recaptcha.google.com https://*.gstatic.com *.clerk.com clerk.chained.chat",
      "child-src 'self' https://challenges.cloudflare.com https://*.google.com https://*.recaptcha.net https://recaptcha.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' accounts.google.com github.com www.linkedin.com *.clerk.com clerk.chained.chat",
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
