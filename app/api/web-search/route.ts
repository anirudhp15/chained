import { type NextRequest, NextResponse } from "next/server";
import { searchWithTavily, type WebSearchData } from "@/lib/tavily-search";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  publishedDate?: string;
}

interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  searchedAt: number;
}

export async function POST(request: NextRequest) {
  try {
    const { query, options } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Use Tavily for real web search
    const searchResults: WebSearchData = await searchWithTavily(query, {
      searchDepth: options?.searchDepth || "basic",
      includeAnswer: options?.includeAnswer !== false, // Default to true
      maxResults: options?.maxResults || 10,
    });

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Web search failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
}

// Example implementation with a real search API (commented out)
/*
async function performRealWebSearch(query: string): Promise<SearchResult[]> {
  // Example with Google Custom Search API
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error("Search API credentials not configured");
  }
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Search API error: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.items?.map((item: any) => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    source: new URL(item.link).hostname,
    publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'] || undefined,
  })) || [];
}
*/
