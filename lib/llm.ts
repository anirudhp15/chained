import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function callLLM({ model, prompt }: { model: string; prompt: string }): Promise<string> {
  try {
    if (model.startsWith("gpt-") || model.includes("openai")) {
      const completion = await openai.chat.completions.create({
        model: model.replace("openai-", ""),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      })

      return completion.choices[0]?.message?.content || "No response generated"
    }

    if (model.includes("claude")) {
      const message = await anthropic.messages.create({
        model: model,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      })

      const content = message.content[0]
      return content.type === "text" ? content.text : "No response generated"
    }

    throw new Error(`Unsupported model: ${model}`)
  } catch (error) {
    console.error("LLM call failed:", error)
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
