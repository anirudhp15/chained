import { tool } from "ai";
import { z } from "zod";
import { searchWithTavily } from "./tavily-search";

// Unified web search tool for all providers
export const webSearchTool = tool({
  description: "Search the web for current information",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .default(10)
      .describe("Maximum number of results to return"),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      const searchData = await searchWithTavily(query, { maxResults });
      return {
        success: true,
        results: searchData.results,
        aiAnswer: searchData.aiAnswer,
      };
    } catch (error) {
      console.error("Web search failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  },
});

// File analysis tool (placeholder for now)
export const analyzeFileTool = tool({
  description: "Analyze uploaded files for content, structure, and insights",
  parameters: z.object({
    fileName: z.string().describe("Name of the file to analyze"),
    analysisType: z
      .enum(["content", "structure", "summary", "code_review"])
      .describe("Type of analysis to perform"),
  }),
  execute: async ({ fileName, analysisType }) => {
    // This is a placeholder - in a real implementation, you'd analyze the file
    return {
      success: true,
      analysis: `Analysis of ${fileName} (type: ${analysisType}) would be performed here`,
    };
  },
});

// Export all tools as a collection
export const AI_TOOLS = {
  web_search: webSearchTool,
  analyze_file: analyzeFileTool,
};

// Helper to get tools based on capabilities
export function getToolsForModel(
  model: string,
  enabledTools: string[] = []
): Record<string, any> {
  const tools: Record<string, any> = {};

  // Add web search for all models if enabled
  if (enabledTools.includes("web_search")) {
    tools.web_search = webSearchTool;
  }

  // Add file analysis if enabled
  if (enabledTools.includes("analyze_file")) {
    tools.analyze_file = analyzeFileTool;
  }

  return tools;
}
