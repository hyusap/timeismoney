/**
 * API endpoint for generating session summaries
 * Receives sample images and batch summaries, returns comprehensive session summary
 */

import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/openrouter-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sampleImages, batchSummaries, totalFrames, totalBatches } = body;

    if (!sampleImages || sampleImages.length === 0) {
      return NextResponse.json(
        { error: "No sample images provided" },
        { status: 400 }
      );
    }

    // Get OpenRouter API key
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Build context from previous summaries
    const batchContext = batchSummaries
      .map((b: any) => `Batch ${b.batchNumber} (frames ${b.frameRange}): ${b.summary}`)
      .join("\n");

    const frameDescriptions = sampleImages
      .map((img: any, idx: number) =>
        `Sample ${idx + 1} (Batch ${img.batchNumber}, Frame #${img.frameNumber}): ${img.description}`
      )
      .join("\n\n");

    // Create comprehensive prompt
    const prompt = `You are analyzing a streaming session. Here's what happened:

BATCH SUMMARIES:
${batchContext}

SAMPLE FRAME DESCRIPTIONS:
${frameDescriptions}

STATISTICS:
- Total frames analyzed: ${totalFrames}
- Total batches: ${totalBatches}
- Sample images provided: ${sampleImages.length}

Based on the sample images you're about to see and the frame descriptions above, provide a comprehensive summary of this entire streaming session. Focus on:
1. Overall activities and events
2. Key moments or changes
3. Timeline of what happened
4. Any patterns or notable observations

Keep the summary concise but informative (3-5 paragraphs).`;

    // Prepare message content with images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    // Add sample images (limit to prevent token overflow)
    const maxImages = 10;
    const imagesToInclude = sampleImages.slice(0, maxImages);

    imagesToInclude.forEach((sample: any) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: sample.image,
        },
      });
    });

    // Call OpenRouter with multi-image prompt
    const client = new OpenRouterClient(openRouterApiKey);

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
        max_tokens: 500,
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
      metadata: {
        totalFrames,
        totalBatches,
        samplesAnalyzed: imagesToInclude.length,
      },
    });
  } catch (error) {
    console.error("Error generating session summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate session summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
