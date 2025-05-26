import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const sessionId = await convex.mutation(api.mutations.createSession, {
      title,
    });

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Session creation failed",
      },
      { status: 500 }
    );
  }
}
