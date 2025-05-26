import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/m4a",
      "audio/webm",
      "audio/ogg",
    ];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: "Invalid audio file type" },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    // Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // You can make this configurable
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      words: transcription.words || [],
    });
  } catch (error) {
    console.error("Audio transcription failed:", error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes("Invalid file format")) {
        return NextResponse.json(
          { error: "Invalid audio file format" },
          { status: 400 }
        );
      }
      if (error.message.includes("File too large")) {
        return NextResponse.json(
          { error: "Audio file too large" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
