import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

// Initialize an unauthenticated Convex client. We'll set the auth token per-request.
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Retrieve the authenticated Clerk user and their Convex token
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    // Attach the token so subsequent Convex mutations are executed as this user
    convex.setAuth(token);

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
