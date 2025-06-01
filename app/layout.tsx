import type { Metadata } from "next";
import "./globals.css";
import { ConvexProvider } from "./convex-provider";
import { MathJaxContext } from "better-react-mathjax";
import { SidebarProvider } from "@/lib/sidebar-context";
import { PostHogProvider } from "./posthog-provider";

// MathJax configuration for the entire app
const mathJaxConfig = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    ignoreHtmlClass: "tex2jax_ignore",
    processHtmlClass: "tex2jax_process",
  },
};

export const metadata: Metadata = {
  title: "Chained - Build Powerful AI Workflows",
  description:
    "Chain multiple AI models together to create sophisticated workflows. Connect GPT-4, Claude, Gemini, and more in powerful sequences.",
  keywords: [
    "AI workflow",
    "AI chaining",
    "GPT-4",
    "Claude",
    "Gemini",
    "AI automation",
    "AI agents",
    "workflow builder",
  ],
  authors: [{ name: "Chained" }],
  creator: "Chained",
  publisher: "Chained",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://chained.app"), // Replace with your actual domain
  alternates: {
    canonical: "/",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  openGraph: {
    title: "Chained - Build Powerful AI Workflows",
    description:
      "Chain multiple AI models together to create sophisticated workflows. Connect GPT-4, Claude, Gemini, and more in powerful sequences.",
    url: "https://chained.app",
    siteName: "Chained",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Chained - AI Workflow Builder",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chained - Build Powerful AI Workflows",
    description:
      "Chain multiple AI models together to create sophisticated workflows. Connect GPT-4, Claude, Gemini, and more in powerful sequences.",
    creator: "@chained_app",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when ready
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#9333ea",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chained",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-950">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="antialiased bg-gray-950 min-h-screen overflow-x-hidden font-sans">
        <PostHogProvider>
          <MathJaxContext config={mathJaxConfig}>
            <ConvexProvider>
              <SidebarProvider>
                <div className="min-h-screen bg-gray-950">{children}</div>
              </SidebarProvider>
            </ConvexProvider>
          </MathJaxContext>
        </PostHogProvider>
      </body>
    </html>
  );
}