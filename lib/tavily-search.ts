import { tavily } from "@tavily/core";

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  publishedDate?: string;
}

export interface WebSearchData {
  query: string;
  results: SearchResult[];
  searchedAt: number;
  aiAnswer?: string; // Enhanced with AI-generated answer from Tavily
}

interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
  includeImages?: boolean;
  includeRawContent?: boolean;
  maxResults?: number;
}

export async function searchWithTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<WebSearchData> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY environment variable is not set");
  }

  const {
    searchDepth = "basic",
    includeAnswer = true,
    includeImages = false,
    includeRawContent = false,
    maxResults = 10,
  } = options;

  try {
    const client = tavily({ apiKey });

    const response = await client.search(query, {
      searchDepth,
      includeAnswer,
      includeImages,
      includeRawContent,
      maxResults,
    });

    // Transform Tavily results to our SearchResult format
    const results: SearchResult[] = response.results.map((result: any) => ({
      title: result.title || "Untitled",
      snippet: result.content || "No description available",
      url: result.url,
      source: extractDomain(result.url),
      publishedDate: result.publishedDate || undefined,
    }));

    return {
      query,
      results,
      searchedAt: Date.now(),
      aiAnswer: response.answer || undefined,
    };
  } catch (error) {
    console.error("Tavily search failed:", error);

    // Fallback to mock results if Tavily fails
    const fallbackResults: SearchResult[] = [
      {
        title: `Search results for: ${query}`,
        snippet: `Unable to fetch real-time results. This is a fallback result for the query "${query}". Please check your Tavily API configuration.`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        source: "Fallback",
        publishedDate: new Date().toLocaleDateString(),
      },
    ];

    return {
      query,
      results: fallbackResults,
      searchedAt: Date.now(),
      aiAnswer: `Unable to generate AI answer for "${query}" due to search service unavailability.`,
    };
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "Unknown source";
  }
}

// Enhanced search with context for better results
export async function searchWithContext(
  query: string,
  context?: string,
  options: TavilySearchOptions = {}
): Promise<WebSearchData> {
  const enhancedQuery = context ? `${query} ${context}` : query;

  return searchWithTavily(enhancedQuery, {
    ...options,
    searchDepth: "advanced",
    includeAnswer: true,
  });
}
