/**
 * API endpoint for generating final chunk summaries with task completion detection
 * Receives 7 sampled images + batch summaries, determines if task is complete
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
    const { sampleImages, batchSummaries, mainTaskPrompt, chunkDuration, recentMessages } = body;

    if (!sampleImages || sampleImages.length === 0) {
      return NextResponse.json(
        { error: "No sample images provided" },
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

    // Build chronological context from batch summaries
    const batchContext = batchSummaries
      .map((b: any) =>
        `Batch ${b.batchNumber} (frames ${b.frameRange}):\n${b.summary}`
      )
      .join("\n\n");

    const sampleDescriptions = sampleImages
      .map((img: any) =>
        `Sample Frame ${img.frameNumber}: ${img.description}`
      )
      .join("\n");

    // Build chat context if available
    let chatContext = "";
    if (recentMessages && recentMessages.length > 0) {
      const messages = (recentMessages as ChatMessage[])
        .map(msg => `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.sender}: ${msg.message}`)
        .join("\n");
      chatContext = `\nALL COMMANDS FROM TIME SLOT WINNER DURING THIS CHUNK:
${messages}\n`;
    }

    // Create comprehensive chunk analysis prompt
    const prompt = `You are analyzing a ${chunkDuration}-minute chunk of a video stream.
${chatContext}
${mainTaskPrompt ? `TASK CONTEXT:\n${mainTaskPrompt}\n` : ""}
CHRONOLOGICAL BATCH SUMMARIES:
${batchContext}

SAMPLED FRAME DESCRIPTIONS:
${sampleDescriptions}

Based on the ${sampleImages.length} sample images you're about to see, the batch summaries above, ${recentMessages && recentMessages.length > 0 ? "the commands from the time slot winner, " : ""}and the frame descriptions, provide:

1. CHUNK SUMMARY (3-4 sentences):
   - ${recentMessages && recentMessages.length > 0 ? "How the person responded to the winner's commands during this period" : "What the person accomplished in this period"}
   - Key activities and observable actions
   - Any notable events or changes

2. ${recentMessages && recentMessages.length > 0 ? "COMMAND COMPLETION ANALYSIS:" : "TASK COMPLETION ANALYSIS:"}
   - ${recentMessages && recentMessages.length > 0 ? "Did the person follow and complete the winner's instructions?" : "Has the person COMPLETED the task?"}
   - Be strict: only mark as complete if there's clear evidence
   - If uncertain or still in progress, mark as incomplete

Format your response EXACTLY as:
SUMMARY: [your summary here]
COMPLETED: [YES or NO]`;

    // Prepare message content with images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    // Add sampled images
    sampleImages.forEach((img: any) => {
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
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `OpenRouter API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const fullResponse = data.choices[0]?.message?.content || "";

    // Parse response
    const summaryMatch = fullResponse.match(/SUMMARY:\s*(.+?)(?=COMPLETED:|$)/s);
    const completedMatch = fullResponse.match(/COMPLETED:\s*(YES|NO)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : fullResponse;
    const taskCompleted = completedMatch
      ? completedMatch[1].toUpperCase() === "YES"
      : false;

    return NextResponse.json({
      success: true,
      summary,
      taskCompleted,
      rawResponse: fullResponse,
    });
  } catch (error) {
    console.error("Error generating chunk summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate chunk summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
