/**
 * ChromaDB Client for storing VLM chunk summaries
 */

import { CloudClient, IEmbeddingFunction } from "chromadb";
import OpenAI from "openai";

let client: CloudClient | null = null;
let openaiClient: OpenAI | null = null;

export function getChromaClient(): CloudClient {
  if (!client) {
    const apiKey = process.env.CHROMADB_API_KEY;

    if (!apiKey) {
      throw new Error("CHROMADB_API_KEY not configured in environment");
    }

    client = new CloudClient({
      apiKey,
      tenant: "15c4c4d6-de1d-42df-b08e-3a484a3498e5",
      database: "humancapital",
    });
  }

  return client;
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured in environment");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Custom OpenAI embedding function for ChromaDB
class OpenAIEmbeddingFunction implements IEmbeddingFunction {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  public async generate(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }
}

function getEmbeddingFunction(): IEmbeddingFunction {
  const openai = getOpenAIClient();
  return new OpenAIEmbeddingFunction(openai);
}

export interface ChunkSummaryDocument {
  walletAddress: string;
  roomName: string;
  timestamp: number;
  chunkDuration: number;
  summary: string;
  taskCompleted: boolean;
  mainTaskPrompt: string;
  frameCount: number;
}

/**
 * Store a chunk summary in ChromaDB
 */
export async function storeChunkSummary(
  doc: ChunkSummaryDocument
): Promise<void> {
  try {
    const client = getChromaClient();
    const embeddingFunction = getEmbeddingFunction();

    // Get or create collection with embedding function
    const collection = await client.getOrCreateCollection({
      name: "chunk_summaries",
      metadata: { description: "VLM chunk summaries for time auction tasks" },
      embeddingFunction,
    });

    // Create unique ID
    const id = `${doc.walletAddress}_${doc.timestamp}`;

    // Store document (embeddings will be generated automatically)
    await collection.add({
      ids: [id],
      documents: [doc.summary],
      metadatas: [
        {
          wallet_address: doc.walletAddress,
          room_name: doc.roomName,
          timestamp: doc.timestamp,
          chunk_duration: doc.chunkDuration,
          task_completed: doc.taskCompleted,
          main_task_prompt: doc.mainTaskPrompt,
          frame_count: doc.frameCount,
        },
      ],
    });

    console.log(`✅ [ChromaDB] Stored chunk summary: ${id}`);
  } catch (error) {
    console.error("❌ [ChromaDB] Failed to store chunk summary:", error);
    throw error;
  }
}

/**
 * Query chunk summaries for a specific wallet address
 */
export async function queryChunkSummariesByWallet(
  walletAddress: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const client = getChromaClient();
    const embeddingFunction = getEmbeddingFunction();

    const collection = await client.getCollection({
      name: "chunk_summaries",
      embeddingFunction,
    });

    const results = await collection.query({
      queryTexts: [""],
      nResults: limit,
      where: { wallet_address: walletAddress },
    });

    return results.metadatas[0] || [];
  } catch (error) {
    console.error("❌ [ChromaDB] Failed to query chunk summaries:", error);
    throw error;
  }
}
