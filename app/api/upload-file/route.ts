import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const agentStepId = formData.get("agentStepId") as string | null;
    const type = formData.get("type") as "image" | "audio";

    if (!file || !sessionId || !type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: file, sessionId, and type are required",
        },
        { status: 400 }
      );
    }

    // Handle fallback test session case
    if (sessionId === "fallback-test-session") {
      return NextResponse.json(
        {
          error:
            "Test session creation failed. Please ensure Convex is properly configured.",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedAudioTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/m4a",
      "audio/webm",
    ];

    if (type === "image" && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image file type. Supported: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (type === "audio" && !allowedAudioTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid audio file type. Supported: WAV, MP3, M4A, WebM" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    try {
      // Get upload URL from Convex
      const uploadUrl = await convex.mutation(api.mutations.generateUploadUrl);

      // Upload file to Convex
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await result.json();

      // Create attachment record
      const attachmentId = await convex.mutation(
        api.mutations.createAttachment,
        {
          sessionId: sessionId as Id<"chatSessions">,
          agentStepId: agentStepId
            ? (agentStepId as Id<"agentSteps">)
            : undefined,
          type,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          storageId,
          metadata:
            type === "image"
              ? { width: 0, height: 0 }
              : { duration: 0, transcription: "" },
        }
      );

      // Get the attachment URL for immediate use
      const attachmentUrl = await convex.query(api.queries.getAttachmentUrl, {
        storageId,
      });

      return NextResponse.json({
        success: true,
        attachmentId,
        storageId,
        url: attachmentUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (convexError) {
      // Handle Convex-specific errors
      if (
        convexError instanceof Error &&
        convexError.message.includes("ArgumentValidationError")
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid session ID. Please ensure you have a valid chat session.",
          },
          { status: 400 }
        );
      }
      throw convexError;
    }
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
