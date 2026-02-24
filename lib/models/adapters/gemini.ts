import {
  BaseModelAdapter,
  GenerationRequest,
  GenerationResponse,
  ModelConfig,
} from "@/lib/models/base";

export const NANO_BANANA_CONFIG: ModelConfig = {
  id: "gemini-nano-banana-pro",
  name: "Nano Banana Pro",
  provider: "Google",
  type: "image",
  description: "Gemini 3 Pro Image - Advanced image generation with superior quality",
  defaultAspectRatio: "1:1",
  maxResolution: 4096,
  supportedAspectRatios: [
    "1:1",
    "2:3",
    "3:2",
    "3:4",
    "4:3",
    "4:5",
    "5:4",
    "9:16",
    "16:9",
    "21:9",
  ],
  capabilities: {
    editing: true,
    "text-2-image": true,
    "image-2-image": true,
    multiImageEditing: true,
    maxReferenceImages: 14,
  },
};

export const VEO_3_1_CONFIG: ModelConfig = {
  id: "veo-3.1",
  name: "Veo 3.1",
  provider: "google",
  type: "video",
  description: "High quality text-to-video generation model.",
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
  },
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-3-pro-image-preview";
const MAX_RETRIES = 4;
const IMAGE_DELAY_MS = 2000;

const ASPECT_RATIO_DIMS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 832, height: 1248 },
  "3:2": { width: 1248, height: 832 },
  "3:4": { width: 864, height: 1184 },
  "4:3": { width: 1184, height: 864 },
  "4:5": { width: 896, height: 1152 },
  "5:4": { width: 1152, height: 896 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
  "21:9": { width: 1536, height: 672 },
};

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { status?: number; code?: number };
  return e.status === 429 || e.code === 429 || /429|rate.?limit|resource.?exhausted/i.test(e.message);
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { status?: number };
  return e.status === 502 || e.status === 503 || e.status === 504 || /502|503|504|service.?unavailable/i.test(e.message);
}

function isQuotaExhaustedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { details?: Array<{ reason?: string }>; error?: { details?: Array<{ reason?: string }> } };
  const msg = e.message || "";
  if (/limit:\s*0|daily.?limit|quota.?exhaust/i.test(msg)) return true;
  const details = e.details ?? e.error?.details;
  if (Array.isArray(details)) {
    return details.some((d) => /RATE_LIMIT_EXCEEDED|DAILY_LIMIT_EXCEEDED/i.test(d.reason ?? ""));
  }
  return false;
}

function redactLargeStrings(value: unknown, maxLen = 256): unknown {
  if (typeof value === "string") {
    return value.length > maxLen ? `<redacted:${value.length}>` : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactLargeStrings(v, maxLen));
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(value as Record<string, unknown>)) {
    out[k] = k === "data" && typeof val === "string" && val.length > maxLen ? `<redacted:${val.length}>` : redactLargeStrings(val, maxLen);
  }
  return out;
}

export class GeminiAdapter extends BaseModelAdapter {
  private apiKey = process.env.GEMINI_API_KEY || "";
  private replicateKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "";

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    try {
      if (this.config.type === "image") {
        return await this.generateImage(request);
      }
      return await this.generateVideo(request);
    } catch (error) {
      return {
        id: `error-${Date.now()}`,
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  private async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const numImages = request.numOutputs || 1;

    if (!this.apiKey) {
      console.log("[Gemini] No GEMINI_API_KEY, using Replicate fallback");
      return this.generateAllViaReplicate(request, numImages);
    }

    const outputs: Array<{ url: string; width: number; height: number }> = [];
    let lastError: string | null = null;
    let usedReplicate = false;

    for (let i = 0; i < numImages; i++) {
      try {
        const output = await this.generateSingleImageWithRetry(request);
        outputs.push(output);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Gemini] Image ${i + 1}/${numImages} failed: ${lastError}`);

        if (this.replicateKey) {
          console.log(`[Gemini] Attempting Replicate fallback for image ${i + 1}`);
          try {
            const fallback = await this.generateImageReplicate(request);
            outputs.push(fallback);
            usedReplicate = true;
          } catch (repErr) {
            console.error("[Gemini] Replicate fallback also failed:", repErr instanceof Error ? repErr.message : repErr);
          }
        }
      }

      if (i < numImages - 1) {
        await new Promise((r) => setTimeout(r, IMAGE_DELAY_MS));
      }
    }

    if (outputs.length === 0) {
      throw new Error(lastError || "All image generations failed");
    }

    return {
      id: `gen-${Date.now()}`,
      status: "completed",
      outputs,
      metadata: { model: this.config.id, backend: usedReplicate ? "replicate-fallback" : "gemini-api" },
    };
  }

  private async generateSingleImageWithRetry(
    request: GenerationRequest,
  ): Promise<{ url: string; width: number; height: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callGeminiAPI(request);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (isQuotaExhaustedError(err)) {
          console.error("[Gemini] Quota exhausted, breaking retry loop");
          break;
        }

        const retryable = isRateLimitError(err) || isTransientError(err);
        if (retryable && attempt < MAX_RETRIES) {
          const baseDelay = isTransientError(err)
            ? Math.min((attempt + 1) * 2000, 16000)
            : Math.pow(2, attempt - 1) * 1000;
          const delay = baseDelay + Math.random() * baseDelay * 0.5;
          console.log(
            `[Gemini] Attempt ${attempt}/${MAX_RETRIES} hit ${isRateLimitError(err) ? "429" : "5xx"}. Retrying in ${Math.round(delay)}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!retryable) break;
      }
    }

    throw lastError || new Error("Generation failed after retries");
  }

  private async callGeminiAPI(
    request: GenerationRequest,
  ): Promise<{ url: string; width: number; height: number }> {
    const endpoint = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;
    const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];

    const refImages =
      request.referenceImages ?? (request.referenceImage ? [request.referenceImage] : []);
    for (const img of refImages) {
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }

    const aspectRatio = request.aspectRatio || "1:1";
    const resolution = typeof request.resolution === "number" ? request.resolution : 1024;
    const imageSize = resolution >= 4096 ? "4K" : resolution >= 2048 ? "2K" : "1K";

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["image"],
        temperature: 1.0,
        imageConfig: { aspectRatio, imageSize },
      },
    };

    const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const msg = errorBody?.error?.message || `Gemini API error ${response.status}`;
      const apiError: Error & { status?: number; code?: number; details?: unknown } = new Error(msg);
      apiError.status = response.status;
      apiError.code = errorBody?.error?.code;
      apiError.details = errorBody?.error?.details;
      throw apiError;
    }

    const data = await response.json();

    const candidates = data.candidates ?? [];
    if (candidates.length === 0) {
      const blockReason = data.promptFeedback?.blockReason;
      if (blockReason) {
        throw new Error(`Content blocked by safety filter: ${blockReason}. Try rephrasing your prompt.`);
      }
      throw new Error("No candidates returned. The prompt may have been filtered. Try rephrasing.");
    }

    const imagePart = candidates[0]?.content?.parts?.find(
      (p: Record<string, unknown>) =>
        typeof p.inlineData === "object" &&
        p.inlineData !== null &&
        typeof (p.inlineData as Record<string, unknown>).mimeType === "string" &&
        ((p.inlineData as Record<string, unknown>).mimeType as string).startsWith("image/"),
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error(
        "Gemini returned a response but no image data. This may be transient — please try again.",
      );
    }

    const dims = ASPECT_RATIO_DIMS[aspectRatio] || { width: 1024, height: 1024 };

    return {
      url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      width: dims.width,
      height: dims.height,
    };
  }

  // ── Replicate fallback ─────────────────────────────────────────────

  private async generateAllViaReplicate(
    request: GenerationRequest,
    numImages: number,
  ): Promise<GenerationResponse> {
    const outputs: Array<{ url: string; width: number; height: number }> = [];
    let lastError: string | null = null;

    for (let i = 0; i < numImages; i++) {
      try {
        outputs.push(await this.generateImageReplicate(request));
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (i < numImages - 1) await new Promise((r) => setTimeout(r, IMAGE_DELAY_MS));
    }

    if (outputs.length === 0) {
      throw new Error(lastError || "All Replicate generations failed");
    }

    return {
      id: `gen-${Date.now()}`,
      status: "completed",
      outputs,
      metadata: { model: this.config.id, backend: "replicate" },
    };
  }

  private async generateImageReplicate(
    request: GenerationRequest,
  ): Promise<{ url: string; width: number; height: number }> {
    if (!this.replicateKey) {
      throw new Error("REPLICATE_API_TOKEN not configured. Cannot use Replicate fallback.");
    }

    const baseUrl = "https://api.replicate.com/v1";
    const modelPath = "google/nano-banana-pro";
    const aspectRatio = request.aspectRatio || "1:1";
    const resolution = typeof request.resolution === "number" ? request.resolution : 1024;

    const modelRes = await fetch(`${baseUrl}/models/${modelPath}`, {
      headers: { Authorization: `Token ${this.replicateKey}` },
    });
    if (!modelRes.ok) throw new Error(`Replicate model lookup failed: ${await modelRes.text()}`);
    const modelData = (await modelRes.json()) as { latest_version?: { id?: string } };
    const version = modelData.latest_version?.id;
    if (!version) throw new Error("Replicate latest version not found");

    const input: Record<string, unknown> = {
      prompt: request.prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution >= 4096 ? "4K" : resolution >= 2048 ? "2K" : "1K",
    };

    const refImage =
      request.referenceImage ?? request.referenceImages?.[0] ?? undefined;
    if (refImage) input.image_input = [refImage];

    const predRes = await fetch(`${baseUrl}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.replicateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version, input }),
    });
    if (!predRes.ok) throw new Error(`Replicate prediction failed: ${await predRes.text()}`);
    const prediction = (await predRes.json()) as { id: string };

    let attempts = 0;
    const maxAttempts = 120;
    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;
      const pollRes = await fetch(`${baseUrl}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${this.replicateKey}` },
      });
      if (!pollRes.ok) throw new Error(`Replicate poll failed: ${await pollRes.text()}`);
      const status = (await pollRes.json()) as {
        status: string;
        error?: string;
        output?: unknown;
        metrics?: { predict_time?: number };
      };

      if (status.status === "succeeded") {
        const urls = this.normalizeOutputUrls(status.output);
        if (!urls.length) throw new Error("Replicate returned no outputs");
        const dims = ASPECT_RATIO_DIMS[aspectRatio] || { width: 1024, height: 1024 };
        return { url: urls[0], width: dims.width, height: dims.height };
      }
      if (status.status === "failed" || status.status === "canceled") {
        throw new Error(status.error || "Replicate prediction failed");
      }
    }
    throw new Error("Replicate generation timeout");
  }

  private normalizeOutputUrls(output: unknown): string[] {
    if (!output) return [];
    if (typeof output === "string") return [output];
    if (Array.isArray(output))
      return output.filter((item): item is string => typeof item === "string");
    if (typeof output === "object" && output !== null) {
      const r = output as Record<string, unknown>;
      if (typeof r.url === "string") return [r.url];
      if (Array.isArray(r.urls))
        return r.urls.filter((item): item is string => typeof item === "string");
    }
    return [];
  }

  // ── Video: Veo 3.1 when API key present, else Replicate Kling ───────

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.apiKey) {
      const { KLING_2_6_CONFIG, ReplicateAdapter } = await import("@/lib/models/adapters/replicate");
      const delegate = new ReplicateAdapter(KLING_2_6_CONFIG);
      const result = await delegate.generate(request);
      if (result.status === "completed") {
        return {
          ...result,
          metadata: { ...result.metadata, routedFrom: this.config.id, routedTo: KLING_2_6_CONFIG.id },
        };
      }
      return { ...result, error: result.error || "Video generation failed" };
    }
    return this.generateVideoVeo(request);
  }

  private async generateVideoVeo(request: GenerationRequest): Promise<GenerationResponse> {
    const parameters = (request as { parameters?: Record<string, unknown> }).parameters ?? {};
    const aspectRatio = (parameters.aspectRatio as string) ?? request.aspectRatio ?? "16:9";
    const resolutionRaw = parameters.resolution ?? request.resolution ?? 720;
    const resolution =
      typeof resolutionRaw === "number"
        ? resolutionRaw
        : String(resolutionRaw).toLowerCase() === "4k"
          ? 2160
          : String(resolutionRaw).toLowerCase() === "1080p"
            ? 1080
            : 720;
    let duration = Math.min(8, Math.max(4, Number(parameters.duration ?? request.duration ?? 8)));
    if (resolution === 1080 || resolution === 2160) duration = 8;

    const getDimensions = (ar: string, res: number) => {
      if (ar === "16:9") {
        if (res === 2160) return { width: 3840, height: 2160 };
        if (res === 1080) return { width: 1920, height: 1080 };
        return { width: 1280, height: 720 };
      }
      if (ar === "9:16") {
        if (res === 2160) return { width: 2160, height: 3840 };
        if (res === 1080) return { width: 1080, height: 1920 };
        return { width: 720, height: 1280 };
      }
      return { width: 1280, height: 720 };
    };
    const { width, height } = getDimensions(aspectRatio, resolution);

    const modelId = "veo-3.1-generate-preview";
    const endpoint = `${GEMINI_BASE_URL}/models/${modelId}:predictLongRunning`;

    const parseImageInput = async (
      dataUrl: string | undefined,
      httpUrl: string | undefined
    ): Promise<{ bytes: Buffer; contentType: string } | null> => {
      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        const commaIndex = dataUrl.indexOf(",");
        if (commaIndex === -1) return null;
        const meta = dataUrl.slice(5, commaIndex);
        const base64 = dataUrl.slice(commaIndex + 1);
        const mime = meta.match(/^([^;]+)/)?.[1] ?? "image/jpeg";
        return { bytes: Buffer.from(base64, "base64"), contentType: mime };
      }
      if (httpUrl && typeof httpUrl === "string" && httpUrl.startsWith("http")) {
        const imageResponse = await fetch(httpUrl);
        if (!imageResponse.ok) return null;
        const buf = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        return { bytes: Buffer.from(buf), contentType };
      }
      return null;
    };

    const startFrame = await parseImageInput(
      request.referenceImage as string | undefined,
      request.referenceImageUrl as string | undefined
    );
    const endFrame = await parseImageInput(
      parameters.endFrameImage as string | undefined,
      parameters.endFrameImageUrl as string | undefined
    );

    type ImageSchema = "bytesBase64Encoded" | "inlineData";
    const buildImageObject = (base64: string, mime: string, schema: ImageSchema) =>
      schema === "bytesBase64Encoded"
        ? { bytesBase64Encoded: base64, mimeType: mime }
        : { inlineData: { mimeType: mime, data: base64 } };

    const buildPayload = (schema: ImageSchema) => {
      const instance: Record<string, unknown> = { prompt: request.prompt };
      if (startFrame) {
        instance.image = buildImageObject(
          startFrame.bytes.toString("base64"),
          startFrame.contentType,
          schema
        );
      }
      const payload: Record<string, unknown> = {
        instances: [instance],
        parameters: {
          aspectRatio,
          resolution: resolution === 2160 ? "4k" : resolution === 1080 ? "1080p" : "720p",
          durationSeconds: duration,
        },
      };
      if (endFrame) {
        (payload.parameters as Record<string, unknown>).lastFrame = buildImageObject(
          endFrame.bytes.toString("base64"),
          endFrame.contentType,
          schema
        );
      }
      return payload;
    };

    const makeRequest = async (payload: Record<string, unknown>) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

    const isSchemaError = (msg: string): ImageSchema | null => {
      const m = msg.toLowerCase();
      if (m.includes("inlinedata") && (m.includes("isn't supported") || m.includes("not supported"))) return "bytesBase64Encoded";
      if (m.includes("bytesbase64encoded") && (m.includes("isn't supported") || m.includes("not supported"))) return "inlineData";
      return null;
    };

    let schema: ImageSchema = "bytesBase64Encoded";
    let response = await makeRequest(buildPayload(schema));
    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const errMsg = errData?.error?.message ?? "Video generation request failed";
      const alt = isSchemaError(errMsg);
      if (alt && alt !== schema) {
        schema = alt;
        response = await makeRequest(buildPayload(schema));
      }
      if (!response.ok) {
        const retryErr = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(retryErr?.error?.message ?? errMsg);
      }
    }

    const operation = (await response.json()) as { name?: string };
    const operationName = operation.name;
    if (!operationName) throw new Error("No operation name in Veo response");

    const maxAttempts = 30;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await new Promise((r) => setTimeout(r, 10000));
      const statusRes = await fetch(`${GEMINI_BASE_URL}/${operationName}`, {
        headers: { "x-goog-api-key": this.apiKey },
      });
      if (!statusRes.ok) throw new Error("Failed to check operation status");
      const status = (await statusRes.json()) as {
        done?: boolean;
        response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } };
      };
      if (!status.done) continue;
      const generatedVideo = status.response?.generateVideoResponse?.generatedSamples?.[0];
      if (!generatedVideo?.video?.uri) throw new Error("No video in response");
      const videoUri = generatedVideo.video.uri;
      return {
        id: `gen-${Date.now()}`,
        status: "completed",
        outputs: [{ url: videoUri, width, height, duration }],
        metadata: { model: this.config.id, operationName },
      };
    }
    throw new Error("Video generation timeout");
  }
}
