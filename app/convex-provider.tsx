"use client"

import type React from "react"

import { ConvexProvider as BaseConvexProvider } from "convex/react"
import { ConvexReactClient } from "convex/react"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>
}
