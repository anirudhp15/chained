import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { callLLM } from "../../../lib/llm";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, agents } = await request.json();

    // Process agents sequentially
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];

      // Add agent step to database
      const stepId = await convex.mutation(api.mutations.addAgentStep, {
        sessionId,
        index: i,
        model: agent.model,
        prompt: agent.prompt,
      });

      // Process multimodal attachments
      const imageUrls: Array<{ url: string; description?: string }> = [];
      let audioTranscription: string | undefined;
      let webSearchResults:
        | Array<{
            title: string;
            snippet: string;
            url: string;
            source?: string;
          }>
        | undefined;

      // Handle images
      if (agent.images && agent.images.length > 0) {
        for (const image of agent.images) {
          // Upload image and get URL
          const formData = new FormData();
          const response = await fetch(image.preview);
          const blob = await response.blob();
          const file = new File([blob], image.name, { type: blob.type });

          formData.append("file", file);
          formData.append("sessionId", sessionId);
          formData.append("agentStepId", stepId);
          formData.append("type", "image");

          const uploadResponse = await fetch("/api/upload-file", {
            method: "POST",
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            imageUrls.push({
              url: uploadResult.url,
              description: image.name,
            });
          }
        }
      }

      // Handle audio transcription
      if (agent.audioBlob) {
        const formData = new FormData();
        formData.append("audio", agent.audioBlob);

        const transcribeResponse = await fetch("/api/transcribe-audio", {
          method: "POST",
          body: formData,
        });

        if (transcribeResponse.ok) {
          const transcribeResult = await transcribeResponse.json();
          audioTranscription = transcribeResult.transcription;

          // Store audio transcription in database only if transcription exists
          if (audioTranscription) {
            await convex.mutation(api.mutations.addAudioTranscription, {
              stepId,
              originalText: audioTranscription,
              duration: transcribeResult.duration,
            });
          }
        }
      }

      // Handle web search
      if (agent.webSearchData) {
        // Transform results to match expected schema
        const transformedResults = agent.webSearchData.results.map(
          (result: {
            title: string;
            snippet: string;
            url: string;
            source?: string;
          }) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            source: result.source,
            publishedDate: undefined, // Optional field
          })
        );

        webSearchResults = agent.webSearchData.results;

        // Store web search results in database
        await convex.mutation(api.mutations.addWebSearchResults, {
          stepId,
          query: agent.webSearchData.query,
          results: transformedResults,
        });
      }

      // Call LLM with multimodal data
      const response = await callLLM({
        model: agent.model,
        prompt: agent.prompt,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        audioTranscription,
        webSearchResults,
      });

      // Update with response
      await convex.mutation(api.mutations.updateAgentResponse, {
        stepId,
        response: response.content,
        tokenUsage: response.tokenUsage,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chain execution failed:", error);
    return NextResponse.json(
      { error: "Failed to execute chain" },
      { status: 500 }
    );
  }
}
