/**
 * API endpoint for client-side VLM analysis
 * This receives base64 images from the browser and sends them to OpenRouter
 */

import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/openrouter-client";

interface ChatMessage {
  message: string;
  timestamp: number;
  sender: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt, recentMessages } = body;

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

    // Build prompt with recent chat context if available
    let finalPrompt = prompt || "What do you see in this image? Provide a detailed description.";

    if (recentMessages && recentMessages.length > 0) {
      const messages = (recentMessages as ChatMessage[])
        .map(msg => `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.sender}: ${msg.message}`)
        .join("\n");

      finalPrompt = `Recent commands from the time slot winner:
${messages}

Based on these recent commands and what you see in the image, describe what the person is doing. Focus on whether they are following the instructions given.`;
    }

    // Analyze image
    const client = new OpenRouterClient(openRouterApiKey);
    const result = await client.analyzeImage(image, {
      prompt: finalPrompt,
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
