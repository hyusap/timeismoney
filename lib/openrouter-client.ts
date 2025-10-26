/**
 * OpenRouter API Client for Vision-Language Model Inference
 */

export interface VLMInferenceOptions {
  model?: string;
  prompt?: string;
  maxTokens?: number;
}

export interface VLMInferenceResult {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  tokensUsed?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Run VLM inference on a base64-encoded image
   * @param imageBase64 Base64 encoded image (with or without data:image prefix)
   * @param options Inference options
   * @returns VLM inference result
   */
  async analyzeImage(
    imageBase64: string,
    options: VLMInferenceOptions = {}
  ): Promise<VLMInferenceResult> {
    const {
      model = "openai/gpt-4o", // High quality, fast VLM with excellent vision capabilities
      prompt = "What do you see in this image? Provide a detailed description.",
      maxTokens = 300,
    } = options;

    try {
      // Ensure proper data URL format
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://timeismoney.app", // Optional: your site URL
          "X-Title": "TimeIsMoney VLM Worker", // Optional: your app name
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenRouter API error: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        content: data.choices[0]?.message?.content || "No response",
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test the OpenRouter API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Create a small test image (1x1 red pixel)
      const testImage =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

      const result = await this.analyzeImage(testImage, {
        prompt: "What color is this?",
        maxTokens: 10,
      });
      return result.success;
    } catch (error) {
      return false;
    }
  }
}
