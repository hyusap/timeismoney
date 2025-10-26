/**
 * API endpoint for client-side VLM analysis
 * This receives base64 images from the browser and sends them to OpenRouter
 */

import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/openrouter-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt } = body;

    if (!image) {
      return NextResponse.json(
        { error: "image is required" },
        { status: 400 }
      );
    }

    // Get OpenRouter API key from environment
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Analyze image
    const client = new OpenRouterClient(openRouterApiKey);
    const result = await client.analyzeImage(image, {
      prompt: prompt || "What do you see in this image? Provide a detailed description.",
      maxTokens: 300,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        content: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in VLM analyze:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
