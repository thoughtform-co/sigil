import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiAdapter, NANO_BANANA_2_CONFIG } from "@/lib/models/adapters/gemini";

const originalFetch = global.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalReplicateToken = process.env.REPLICATE_API_TOKEN;
const referenceImages = [
  "https://example.com/reference-1.png",
  "https://example.com/reference-2.png",
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("model reference image passthrough", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    process.env.REPLICATE_API_TOKEN = originalReplicateToken;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("includes every reference image in the Gemini image payload", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.REPLICATE_API_TOKEN = "";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([4, 5, 6]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data: "aW1hZ2U=" } }],
              },
            },
          ],
        }),
      );

    global.fetch = fetchMock;

    const adapter = new GeminiAdapter(NANO_BANANA_2_CONFIG);
    const result = await adapter.generate({
      prompt: "Blend both references into one scene",
      referenceImages,
      numOutputs: 1,
      aspectRatio: "1:1",
      resolution: 1024,
    });

    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const geminiRequest = fetchMock.mock.calls[2];
    const geminiBody = JSON.parse(String(geminiRequest?.[1]?.body)) as {
      contents: Array<{ parts: Array<Record<string, unknown>> }>;
    };
    const imageParts = geminiBody.contents[0]?.parts.filter((part) => "inlineData" in part);

    expect(imageParts).toHaveLength(2);
    expect(geminiBody.contents[0]?.parts[0]).toEqual({ text: "Blend both references into one scene" });
  });

  it("keeps every reference image when Gemini falls back to Replicate", async () => {
    process.env.GEMINI_API_KEY = "";
    process.env.REPLICATE_API_TOKEN = "test-replicate-key";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ latest_version: { id: "version-1" } }))
      .mockResolvedValueOnce(jsonResponse({ id: "prediction-1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          output: ["https://example.com/output.png"],
        }),
      );

    global.fetch = fetchMock;

    const adapter = new GeminiAdapter(NANO_BANANA_2_CONFIG);
    const resultPromise = adapter.generate({
      prompt: "Blend both references into one scene",
      referenceImages,
      numOutputs: 1,
      aspectRatio: "1:1",
      resolution: 1024,
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const replicatePredictionRequest = fetchMock.mock.calls[1];
    const predictionBody = JSON.parse(String(replicatePredictionRequest?.[1]?.body)) as {
      input: { image_input?: string[] };
    };

    expect(predictionBody.input.image_input).toEqual(referenceImages);
  });
});
