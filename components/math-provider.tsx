"use client";

import { ReactNode } from "react";
import "katex/dist/katex.min.css";

// Simple KaTeX provider - KaTeX CSS is loaded globally
export function MathProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
