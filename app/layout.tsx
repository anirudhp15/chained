import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexProvider } from "./convex-provider";
import { SidebarProvider } from "@/lib/sidebar-context";
import { PostHogProvider } from "./posthog-provider";
import { MathProvider } from "@/components/math-provider";
import { CopyTrackingProvider } from "@/lib/copy-tracking-context";
// Temporarily disabled for debugging
// import { RouteWarmerInitializer } from "@/components/RouteWarmerInitializer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ChainedChat",
  description: "Orchestrate multiple LLMs in a single chat interface",
  keywords: [
    "AI workflow",
    "AI chaining",
    "ChatGPT",
    "Claude",
    "Gemini",
    "AI automation",
    "AI agents",
    "workflow builder",
    "chainedchat",
    "chained",
    "chat",
    "chatbot",
    "chatgpt",
    "claude",
    "gemini",
  ],
  authors: [{ name: "Ani Potts" }],
  creator: "Ani Potts",
  publisher: "Ani Potts",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://chained.chat"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ChainedChat",
    description: "Orchestrate multiple LLMs in a single chat interface",
    url: "https://chained.chat",
    siteName: "ChainedChat",
    images: [
      {
        url: "/cc_logo_dark.png",
        width: 1200,
        height: 630,
        alt: "ChainedChat - Orchestrate multiple LLMs in a single chat interface",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainedChat - Orchestrate multiple LLMs in a single chat interface",
    description: "Orchestrate multiple LLMs in a single chat interface",
    creator: "@anipotts",
    images: ["/cc_logo_dark.png"],
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
    google: "K3n_KG2bYC5_hME2PSZQtA_Hi-nU9S14ony0Ny1vrdA",
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  icons: {
    icon: [
      { url: "/cc_logo_dark.png", sizes: "16x16", type: "image/png" },
      { url: "/cc_logo_dark.png", sizes: "32x32", type: "image/png" },
      { url: "/cc_logo_dark.png", sizes: "any" },
    ],
    shortcut: "/cc_logo_dark.png",
    apple: [{ url: "/cc_logo_dark.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/cc_logo_dark.png",
        color: "#030712",
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
      <body className="antialiased bg-gray-950 min-h-screen overflow-x-hidden font-sans">
        <PostHogProvider>
          <MathProvider>
            <ConvexProvider>
              <SidebarProvider>
                <CopyTrackingProvider>
                  {/* Temporarily disabled for debugging */}
                  {/* <RouteWarmerInitializer /> */}
                  <div className="min-h-screen bg-gray-950">{children}</div>
                </CopyTrackingProvider>
              </SidebarProvider>
            </ConvexProvider>
          </MathProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
