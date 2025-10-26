/**
 * API endpoint for searching user history using natural language
 * Queries ChromaDB with semantic search to find relevant activities
 */

import { NextRequest, NextResponse } from "next/server";
import { getChromaClient, getOpenAIClient } from "@/lib/chromadb-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, query } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Get ChromaDB client
    const chromaClient = getChromaClient();
    const openaiClient = getOpenAIClient();

    // Get the collection
    const collection = await chromaClient.getCollection({
      name: "chunk_summaries",
    });

    // Generate embedding for the query
    const embeddingResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: [query],
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query ChromaDB with semantic search
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 10,
      where: { wallet_address: walletAddress },
    });

    // Format results
    const formattedResults = [];
    if (results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        const metadata = results.metadatas?.[0]?.[i];
        const document = results.documents[0][i];
        const distance = results.distances?.[0]?.[i];

        if (metadata && document) {
          formattedResults.push({
            summary: document,
            timestamp: metadata.timestamp,
            roomName: metadata.room_name,
            chunkDuration: metadata.chunk_duration,
            taskCompleted: metadata.task_completed,
            mainTaskPrompt: metadata.main_task_prompt,
            frameCount: metadata.frame_count,
            relevanceScore: distance !== undefined && distance !== null ? 1 - distance : 0,
          });
        }
      }
    }

    // Use OpenRouter to generate a quick analysis
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    let analysis = "";

    if (openRouterApiKey && formattedResults.length > 0) {
      const context = formattedResults
        .map((r, idx) => {
          const timestamp = typeof r.timestamp === 'string' || typeof r.timestamp === 'number'
            ? new Date(r.timestamp).toLocaleString()
            : "Unknown time";
          return `${idx + 1}. [${timestamp}] ${r.summary} (Task: ${r.mainTaskPrompt || "N/A"})`;
        })
        .join("\n");

      const analysisPrompt = `Based on this user's activity history, answer this question: "${query}"

Activity History:
${context}

Provide a direct, factual answer in 2-3 sentences. Be critical and honest about patterns or concerns.`;

      try {
        const analysisResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://timeismoney.app",
            "X-Title": "TimeIsMoney User History Search",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: analysisPrompt,
              },
            ],
            max_tokens: 200,
          }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          analysis = analysisData.choices[0]?.message?.content || "";
        }
      } catch (error) {
        console.error("Failed to generate analysis:", error);
      }
    }

    return NextResponse.json({
      success: true,
      query,
      walletAddress,
      resultCount: formattedResults.length,
      results: formattedResults,
      analysis,
    });
  } catch (error) {
    console.error("Error searching user history:", error);
    return NextResponse.json(
      {
        error: "Failed to search user history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
