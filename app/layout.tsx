import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexProvider } from "./convex-provider";
import { MathJaxContext } from "better-react-mathjax";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
  openGraph: {
    title: "Chained - Build Powerful AI Workflows",
    description:
      "Chain multiple AI models together to create sophisticated workflows. Connect GPT-4, Claude, Gemini, and more in powerful sequences.",
    url: "https://chained.app",
    siteName: "Chained",
    images: [
      {
        url: "/og-image.png", // We'll create this
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
    creator: "@chained_app", // Replace with your Twitter handle
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
        color: "#9333ea", // Lavender/purple color
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
    <html lang="en" className="bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black min-h-screen overflow-x-hidden`}
      >
        <MathJaxContext config={mathJaxConfig}>
          <ConvexProvider>
            <div className="min-h-screen bg-black">{children}</div>
          </ConvexProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
