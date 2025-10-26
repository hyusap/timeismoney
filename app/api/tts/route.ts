import { createClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { text, model = "aura-2-thalia-en" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    console.log("TTS Request:", { model, text: text.substring(0, 50) + "..." });

    const deepgram = createClient(apiKey);

    // Make the request to Deepgram
    const result = await deepgram.speak.request({ text }, { model });
    const stream = await result.getStream();
    const headers = await result.getHeaders();

    // Return the audio stream with appropriate headers
    const response = new NextResponse(stream, { headers });

    // Disable caching to ensure fresh audio generation
    response.headers.set("Surrogate-Control", "no-store");
    response.headers.set(
      "Cache-Control",
      "s-maxage=0, no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error in TTS route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
