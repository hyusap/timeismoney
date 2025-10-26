/**
 * API endpoint for generating batch summaries
 * Receives up to 10 images and analyzes them in context of main task
 */

import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  message: string;
  timestamp: number;
  sender: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, mainTaskPrompt, recentMessages } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Build context from frame descriptions
    const frameDescriptions = images
      .map((img: any, idx: number) =>
        `Frame ${img.frameNumber}: ${img.description}`
      )
      .join("\n");

    // Build chat context if available
    let chatContext = "";
    if (recentMessages && recentMessages.length > 0) {
      const messages = (recentMessages as ChatMessage[])
        .map(msg => `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.sender}: ${msg.message}`)
        .join("\n");
      chatContext = `\nWINNER COMMANDS DURING THIS BATCH:
${messages}\n`;
    }

    // Create batch analysis prompt
    const prompt = `You are analyzing a batch of ${images.length} frames from a video stream.
${chatContext}
${mainTaskPrompt ? `TASK CONTEXT:\n${mainTaskPrompt}\n` : ""}
FRAME DESCRIPTIONS:
${frameDescriptions}

Based on the images you're about to see and their descriptions${recentMessages && recentMessages.length > 0 ? ", and the commands given by the time slot winner" : ""}, provide a concise summary (2-3 sentences) of what happened in this batch. Focus on:
1. ${recentMessages && recentMessages.length > 0 ? "How the person responded to the winner's commands" : "Key activities observed"}
2. Any progress or changes
3. Notable events or actions

Be specific and action-oriented.`;

    // Prepare message content with images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    // Add all images
    images.forEach((img: any) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: img.image,
        },
      });
    });

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://timeismoney.app",
        "X-Title": "TimeIsMoney VLM Worker",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `OpenRouter API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || "No summary generated";

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error generating batch summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate batch summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
