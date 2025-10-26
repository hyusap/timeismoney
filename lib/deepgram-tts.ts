interface DeepgramTTSParams {
  text: string;
  model?: string;
}

export async function speakWithDeepgram({
  text,
  model = "aura-2-thalia-en",
}: DeepgramTTSParams): Promise<void> {
  try {
    // Call our secure server-side API route
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("TTS API error:", response.status, errorData);

      // If it's a Deepgram API error (not a missing API key), throw to trigger fallback
      if (response.status !== 500) {
        throw new Error("Deepgram API error");
      }
      return;
    }

    // Get the audio blob from the stream
    const audioBlob = await response.blob();

    // Create audio element and play it
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await audio.play();

    // Clean up after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (error) {
    console.error("Error reading message with Deepgram:", error);
    throw error; // Re-throw to trigger fallback
  }
}

// Alternative: Use Web Speech API as fallback (no API key needed)
export function speakWithWebSpeech(text: string, voiceName?: string): void {
  if (!("speechSynthesis" in window)) {
    console.log("Web Speech API not supported in this browser");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Configure voice
  const voices = window.speechSynthesis.getVoices();
  if (voiceName) {
    const selectedVoice = voices.find((voice) =>
      voice.name.toLowerCase().includes(voiceName.toLowerCase())
    );
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  // Configure speech
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}
