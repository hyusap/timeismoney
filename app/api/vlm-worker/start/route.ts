/**
 * API endpoint to start a VLM worker for a specific room
 */

import { NextRequest, NextResponse } from "next/server";
import { VLMWorker } from "@/lib/vlm-worker";
import { vlmWorkerRegistry } from "@/lib/vlm-worker-registry";
import { Controller } from "@/lib/controller";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_name, prompt, frame_interval } = body;

    if (!room_name) {
      return NextResponse.json(
        { error: "room_name is required" },
        { status: 400 }
      );
    }

    // Get OpenRouter API key from environment
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured in environment" },
        { status: 500 }
      );
    }

    // Check if worker already exists for this room
    const existingWorker = vlmWorkerRegistry.get(room_name);
    if (existingWorker) {
      return NextResponse.json(
        {
          message: "VLM worker already running for this room",
          status: existingWorker.getStatus(),
        },
        { status: 200 }
      );
    }

    // Create a token for the VLM bot to join the room
    const controller = new Controller();
    const joinResult = await controller.joinStream({
      room_name,
      identity: `vlm-bot-${Date.now()}`,
    });

    // Create and start the VLM worker
    const worker = new VLMWorker({
      roomName: room_name,
      serverUrl: joinResult.ws_url,
      token: joinResult.livekit_token,
      openRouterApiKey,
      frameInterval: frame_interval || 2000, // Default: 2 seconds (30 frames/min)
      vlmOptions: {
        prompt: prompt || "What do you see in this image? Provide a detailed description.",
        maxTokens: 300,
      },
    });

    // Register and start the worker
    vlmWorkerRegistry.register(room_name, worker);
    await worker.start();

    return NextResponse.json({
      success: true,
      message: "VLM worker started successfully",
      room_name,
      status: worker.getStatus(),
    });
  } catch (error) {
    console.error("Error starting VLM worker:", error);
    return NextResponse.json(
      {
        error: "Failed to start VLM worker",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
