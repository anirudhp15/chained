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
  title: "ChainChat - Chain AI Agents",
  description:
    "Chain up to 3 AI agents and run them sequentially with one click.",
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
