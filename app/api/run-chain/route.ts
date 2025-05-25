import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { callLLM } from "../../../lib/llm"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, agents } = await request.json()

    // Process agents sequentially
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i]

      // Add agent step to database
      const stepId = await convex.mutation(api.mutations.addAgentStep, {
        sessionId,
        index: i,
        model: agent.model,
        prompt: agent.prompt,
      })

      // Call LLM
      const response = await callLLM({
        model: agent.model,
        prompt: agent.prompt,
      })

      // Update with response
      await convex.mutation(api.mutations.updateAgentResponse, {
        stepId,
        response,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Chain execution failed:", error)
    return NextResponse.json({ error: "Failed to execute chain" }, { status: 500 })
  }
}
