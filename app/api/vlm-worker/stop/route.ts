/**
 * API endpoint to stop a VLM worker for a specific room
 */

import { NextRequest, NextResponse } from "next/server";
import { vlmWorkerRegistry } from "@/lib/vlm-worker-registry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_name } = body;

    if (!room_name) {
      return NextResponse.json(
        { error: "room_name is required" },
        { status: 400 }
      );
    }

    const stopped = await vlmWorkerRegistry.stop(room_name);

    if (stopped) {
      return NextResponse.json({
        success: true,
        message: "VLM worker stopped successfully",
        room_name,
      });
    } else {
      return NextResponse.json(
        {
          error: "No VLM worker found for this room",
          room_name,
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error stopping VLM worker:", error);
    return NextResponse.json(
      {
        error: "Failed to stop VLM worker",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
