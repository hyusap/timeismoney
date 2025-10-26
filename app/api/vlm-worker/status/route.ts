/**
 * API endpoint to get status of VLM workers
 */

import { NextRequest, NextResponse } from "next/server";
import { vlmWorkerRegistry } from "@/lib/vlm-worker-registry";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room_name = searchParams.get("room_name");

    if (room_name) {
      // Get status for specific room
      const worker = vlmWorkerRegistry.get(room_name);
      if (worker) {
        return NextResponse.json({
          room_name,
          status: worker.getStatus(),
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
    } else {
      // Get status for all workers
      return NextResponse.json({
        activeRooms: vlmWorkerRegistry.getActiveRooms(),
        workers: vlmWorkerRegistry.getAllStatus(),
      });
    }
  } catch (error) {
    console.error("Error getting VLM worker status:", error);
    return NextResponse.json(
      {
        error: "Failed to get VLM worker status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
