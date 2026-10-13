import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiAdapter, NANO_BANANA_CONFIG, VEO_3_1_CONFIG } from "@/lib/models/adapters/gemini";
import { buildKling3Input, buildSeedanceInput, kling3Mode } from "@/lib/models/adapters/replicate";
import { getModelConfig } from "@/lib/models/registry";

const originalFetch = global.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalReplicateToken = process.env.REPLICATE_API_TOKEN;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const image = (data: string, extra: Record<string, unknown> = {}) => ({
  inlineData: { mimeType: "image/png", data },
  ...extra,
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.GEMINI_API_KEY = originalGeminiKey;
  process.env.REPLICATE_API_TOKEN = originalReplicateToken;
  vi.restoreAllMocks();
});

describe("the Gemini image reply", () => {
  async function drawWith(parts: unknown[]) {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.REPLICATE_API_TOKEN = "";
    global.fetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ candidates: [{ content: { parts } }] }));
    const result = await new GeminiAdapter(NANO_BANANA_CONFIG).generate({ prompt: "a red kettle" });
    return result.outputs?.[0]?.url;
  }

  it("returns the final render, not the first hazy thought image", async () => {
    const url = await drawWith([
      image("ZHJhZnQx", { thought: true }),
      image("ZHJhZnQy", { thought: true }),
      image("ZmluYWw=", { thoughtSignature: "sig" }),
    ]);
    expect(url).toBe("data:image/png;base64,ZmluYWw=");
  });

  it("falls back to the signed image, then to the last one", async () => {
    expect(await drawWith([image("YQ==", { thought: true }), image("Yg==", { thought: true, thoughtSignature: "s" })])).toBe(
      "data:image/png;base64,Yg==",
    );
    expect(await drawWith([{ text: "thinking" }, image("b25seQ==")])).toBe("data:image/png;base64,b25seQ==");
  });
});

describe("the order of a Gemini request", () => {
  async function partsSent(parameters: Record<string, unknown>) {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ candidates: [{ content: { parts: [image("ZmluYWw=")] } }] }));
    global.fetch = fetchMock;
    await new GeminiAdapter(NANO_BANANA_CONFIG).generate({
      prompt: "a red kettle",
      referenceImages: ["data:image/png;base64,cmVm"],
      parameters,
    });
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
    return (body.contents[0].parts as Array<Record<string, unknown>>).map((p) => ("text" in p ? "text" : "image"));
  }

  it("keeps prompt then references for the web app, and puts references first when asked", async () => {
    expect(await partsSent({})).toEqual(["text", "image"]);
    expect(await partsSent({ referencesFirst: true })).toEqual(["image", "text"]);
  });
});

describe("a draw that refuses a fallback", () => {
  it("fails in words instead of switching to the Replicate backup when Gemini errors", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.REPLICATE_API_TOKEN = "test-replicate-token";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => jsonResponse({ error: { message: "model not found", code: 404 } }, 404));
    global.fetch = fetchMock;
    const result = await new GeminiAdapter(NANO_BANANA_CONFIG).generate({
      prompt: "a red kettle",
      parameters: { allowFallback: false },
    });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("model not found");
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("replicate.com"))).toBe(true);
  });

  it("fails when the Google key is missing, for images and for video", async () => {
    process.env.GEMINI_API_KEY = "";
    process.env.REPLICATE_API_TOKEN = "test-replicate-token";
    global.fetch = vi.fn<typeof fetch>();
    for (const config of [NANO_BANANA_CONFIG, VEO_3_1_CONFIG]) {
      const result = await new GeminiAdapter(config).generate({ prompt: "x", parameters: { allowFallback: false } });
      expect(result.status, config.id).toBe("failed");
      expect(result.error, config.id).toContain("not available on this server");
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("the video models Vesper has", () => {
  it("are registered", () => {
    expect(getModelConfig("kling-3")?.type).toBe("video");
    expect(getModelConfig("seedance-2.5")?.type).toBe("video");
  });

  it("maps a resolution to Kling 3.0's mode", () => {
    expect(kling3Mode("720p")).toBe("standard");
    expect(kling3Mode(1080)).toBe("pro");
    expect(kling3Mode("4k")).toBe("4k");
    expect(kling3Mode(undefined)).toBe("pro");
  });

  it("builds the Kling 3.0 input: duration clamped, the end frame only with a start frame", () => {
    const base = { prompt: "a kettle", aspectRatio: "16:9", resolution: "1080p", generateAudio: true };
    expect(buildKling3Input({ ...base, duration: 40, endImage: "https://x/end.png" })).toEqual({
      prompt: "a kettle",
      duration: 15,
      mode: "pro",
      aspect_ratio: "16:9",
      generate_audio: true,
    });
    expect(buildKling3Input({ ...base, duration: 10, startImage: "https://x/a.png", endImage: "https://x/b.png" })).toMatchObject({
      duration: 10,
      start_image: "https://x/a.png",
      end_image: "https://x/b.png",
    });
    expect(() => buildKling3Input({ ...base, prompt: "x".repeat(2501), duration: 5 })).toThrow(/2500 characters/);
  });

  it("builds the Seedance 2.5 input: first and last frame need the adaptive ratio", () => {
    const base = { prompt: "a kettle", aspectRatio: "9:16", generateAudio: false };
    expect(buildSeedanceInput({ ...base, duration: 2, resolution: "1080p" })).toEqual({
      prompt: "a kettle",
      duration: 4,
      resolution: "720p",
      generate_audio: false,
      output_format: "mp4",
      aspect_ratio: "9:16",
    });
    expect(
      buildSeedanceInput({ ...base, duration: 8, resolution: 480, startImage: "https://x/a.png", endImage: "https://x/b.png" }),
    ).toMatchObject({ resolution: "480p", image: "https://x/a.png", last_frame_image: "https://x/b.png", aspect_ratio: "adaptive" });
  });
});
