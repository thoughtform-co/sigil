import {
  BaseModelAdapter,
  collectReferenceImages,
  GenerationRequest,
  GenerationResponse,
  ModelConfig,
} from "@/lib/models/base";

const MAX_NANO_BANANA_REFERENCE_IMAGES = 14;

export const SEEDREAM_4_CONFIG: ModelConfig = {
  id: "seedream-4",
  name: "Seedream 4.5",
  provider: "replicate",
  type: "image",
  description: "High-quality image generation via Replicate.",
  defaultAspectRatio: "1:1",
  supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  capabilities: {
    "text-2-image": true,
  },
};

export const REVE_CONFIG: ModelConfig = {
  id: "reve",
  name: "Reve",
  provider: "replicate",
  type: "image",
  description: "Image generation via Reve on Replicate.",
  defaultAspectRatio: "1:1",
  supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  capabilities: {
    "text-2-image": true,
  },
};

export const KLING_2_6_CONFIG: ModelConfig = {
  id: "kling-2.6",
  name: "Kling 2.6",
  provider: "replicate",
  type: "video",
  description: "Video generation via Kling 2.6 on Replicate.",
  capabilities: {
    "text-2-video": true,
  },
};

/**
 * Kling 3.0 on Replicate (kwaivgi/kling-v3-video), as in Vesper; schema read there 2026-10-12.
 * 3 to 15 seconds; `mode` standard (720p), pro (1080p) or 4k; `start_image` and `end_image`
 * (the end frame needs the start frame). With a start frame Kling takes the frame's proportions.
 */
export const KLING_3_CONFIG: ModelConfig = {
  id: "kling-3",
  name: "Kling 3.0",
  provider: "replicate",
  type: "video",
  description: "Kling Video 3.0: 3 to 15 seconds at 720p, 1080p or 4K, with start and end frame control and native audio.",
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9", "9:16", "1:1"],
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
    "frame-interpolation": true,
    audioGeneration: true,
  },
};

/**
 * Seedance 2.5 on Replicate (bytedance/seedance-2.5), as in Vesper; schema read there 2026-10-12.
 * 4 to 30 seconds in one pass, 480p or 720p, native audio, first and last frame.
 */
export const SEEDANCE_2_5_CONFIG: ModelConfig = {
  id: "seedance-2.5",
  name: "Seedance 2.5",
  provider: "replicate",
  type: "video",
  description: "ByteDance's multimodal video model: up to 30 seconds in one pass at 720p, native audio, start and end frame control.",
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
    "frame-interpolation": true,
    audioGeneration: true,
  },
};

const KLING_3_PROMPT_MAX = 2500;

/** The Kling 3.0 mode for a resolution: 720 and below standard, 2160 and above 4k, else pro (1080p). */
export function kling3Mode(resolution: unknown): "standard" | "pro" | "4k" {
  const lines =
    typeof resolution === "string"
      ? resolution.trim().toLowerCase() === "4k"
        ? 2160
        : parseInt(resolution, 10)
      : typeof resolution === "number"
        ? resolution
        : NaN;
  if (!Number.isFinite(lines)) return "pro";
  if (lines <= 720) return "standard";
  if (lines >= 2160) return "4k";
  return "pro";
}

/** The Kling 3.0 input (ported from Vesper's `buildKling3Input`). */
export function buildKling3Input(params: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  duration: unknown;
  resolution: unknown;
  generateAudio: boolean;
  startImage?: string;
  endImage?: string;
}): Record<string, unknown> {
  if (params.prompt.length > KLING_3_PROMPT_MAX) {
    throw new Error(
      `Kling 3.0 takes a prompt of at most ${KLING_3_PROMPT_MAX} characters; this one has ${params.prompt.length}. Shorten it and try again.`,
    );
  }
  const rawDuration = Number(params.duration);
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    duration: Number.isFinite(rawDuration) ? Math.min(15, Math.max(3, Math.round(rawDuration))) : 5,
    mode: kling3Mode(params.resolution),
    aspect_ratio: ["16:9", "9:16", "1:1"].includes(params.aspectRatio) ? params.aspectRatio : "16:9",
    generate_audio: params.generateAudio,
  };
  if (params.negativePrompt) input.negative_prompt = params.negativePrompt.slice(0, KLING_3_PROMPT_MAX);
  if (params.startImage) {
    input.start_image = params.startImage;
    if (params.endImage) input.end_image = params.endImage;
  }
  return input;
}

/**
 * The Seedance 2.5 input (ported from Vesper's `buildSeedanceInput`, without reference sets).
 * `last_frame_image` needs `image`, and first/last-frame mode only takes the adaptive ratio.
 */
export function buildSeedanceInput(params: {
  prompt: string;
  aspectRatio: string;
  duration: unknown;
  resolution: unknown;
  generateAudio: boolean;
  startImage?: string;
  endImage?: string;
}): Record<string, unknown> {
  const rawDuration = Number(params.duration);
  const lines = typeof params.resolution === "number" ? params.resolution : parseInt(String(params.resolution), 10);
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    duration: Number.isFinite(rawDuration) ? Math.min(30, Math.max(4, Math.round(rawDuration))) : 5,
    resolution: Number.isFinite(lines) && lines > 0 && lines <= 480 ? "480p" : "720p",
    generate_audio: params.generateAudio,
    output_format: "mp4",
    aspect_ratio: params.aspectRatio || "16:9",
  };
  if (params.startImage) {
    input.image = params.startImage;
    if (params.endImage) {
      input.last_frame_image = params.endImage;
      input.aspect_ratio = "adaptive";
    }
  }
  return input;
}

export const NANO_BANANA_BACKUP_CONFIG: ModelConfig = {
  id: "nano-banana-backup",
  name: "Nano Banana Backup",
  provider: "replicate",
  type: "image",
  description: "Backup image generation route via Replicate.",
  defaultAspectRatio: "1:1",
  supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  capabilities: {
    "text-2-image": true,
  },
};

export class ReplicateAdapter extends BaseModelAdapter {
  private apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "";
  private baseUrl = "https://api.replicate.com/v1";

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    if (!this.apiKey) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error:
          "REPLICATE_API_TOKEN is not configured. Add it to .env.local and restart the server.",
      };
    }

    try {
      if (this.config.type === "image") {
        return await this.generateImage(request);
      }
      return await this.generateVideo(request);
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Replicate generation failed",
      };
    }
  }

  private getModelPath(): string {
    switch (this.config.id) {
      case "seedream-4":
        return "bytedance/seedream-4.5";
      case "reve":
        return "reve/create";
      case "nano-banana-backup":
        return "google/nano-banana-pro";
      case "kling-2.6":
        return "kwaivgi/kling-v2.6";
      case "kling-3":
        return "kwaivgi/kling-v3-video";
      case "seedance-2.5":
        return "bytedance/seedance-2.5";
      default:
        throw new Error(`Unsupported Replicate model: ${this.config.id}`);
    }
  }

  private async fetchLatestVersion(modelPath: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/models/${modelPath}`, {
      headers: { Authorization: `Token ${this.apiKey}` },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Replicate model lookup failed: ${body || response.statusText}`);
    }
    const data = (await response.json()) as { latest_version?: { id?: string } };
    const version = data.latest_version?.id;
    if (!version) {
      throw new Error("Replicate latest model version not found");
    }
    return version;
  }

  private async createPrediction(version: string, input: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version, input }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Replicate prediction request failed: ${body || response.statusText}`);
    }

    return (await response.json()) as { id: string };
  }

  private async pollPrediction(predictionId: string) {
    const maxAttempts = this.config.type === "video" ? 180 : 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts += 1;

      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Replicate polling failed: ${body || response.statusText}`);
      }

      const statusData = (await response.json()) as {
        status: string;
        error?: string;
        output?: unknown;
        metrics?: { predict_time?: number };
      };

      if (statusData.status === "succeeded") {
        return statusData;
      }
      if (statusData.status === "failed" || statusData.status === "canceled") {
        throw new Error(statusData.error || "Replicate prediction failed");
      }
    }

    throw new Error("Replicate generation timeout");
  }

  private normalizeOutputUrls(output: unknown): string[] {
    if (!output) return [];
    if (typeof output === "string") return [output];
    if (Array.isArray(output)) return output.filter((item): item is string => typeof item === "string");
    if (typeof output === "object" && output !== null) {
      const record = output as Record<string, unknown>;
      const url = record.url;
      const urls = record.urls;
      if (typeof url === "string") return [url];
      if (Array.isArray(urls)) return urls.filter((item): item is string => typeof item === "string");
    }
    return [];
  }

  private async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const modelPath = this.getModelPath();
    const version = await this.fetchLatestVersion(modelPath);
    const parameters = ((request as { parameters?: Record<string, unknown> }).parameters ?? {}) as Record<
      string,
      unknown
    >;

    const aspectRatio = String(request.aspectRatio || parameters.aspectRatio || "1:1");
    const numOutputs = Number(request.numOutputs || parameters.numOutputs || 1);
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      aspect_ratio: aspectRatio,
    };

    const referenceImages = collectReferenceImages(request, parameters);
    const referenceImage = referenceImages[0];

    if (this.config.id === "seedream-4") {
      const resolution = Number(request.resolution || parameters.resolution || 2048);
      input.size = resolution >= 4096 ? "4K" : "2K";
      input.max_images = Math.min(4, Math.max(1, numOutputs));
      input.enhance_prompt = true;
      if (referenceImage) {
        input.image_input = [referenceImage];
      }
    }

    if (this.config.id === "nano-banana-backup") {
      const resolution = Number(request.resolution || parameters.resolution || 1024);
      input.resolution = resolution >= 4096 ? "4K" : resolution >= 2048 ? "2K" : "1K";
      if (referenceImages.length > 0) {
        input.image_input = referenceImages.slice(0, MAX_NANO_BANANA_REFERENCE_IMAGES);
      }
    }

    const prediction = await this.createPrediction(version, input);
    const result = await this.pollPrediction(prediction.id);
    const urls = this.normalizeOutputUrls(result.output);
    if (!urls.length) {
      throw new Error("Replicate returned no image outputs");
    }

    return {
      id: prediction.id,
      status: "completed",
      outputs: urls.map((url) => ({
        url,
        width: 1024,
        height: 1024,
      })),
      metrics: {
        predictTime: result.metrics?.predict_time,
      },
    };
  }

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    const modelPath = this.getModelPath();
    const version = await this.fetchLatestVersion(modelPath);
    const parameters = ((request as { parameters?: Record<string, unknown> }).parameters ?? {}) as Record<
      string,
      unknown
    >;

    const duration = Number(parameters.duration || 5);
    const aspectRatio = String(request.aspectRatio || parameters.aspectRatio || "16:9");

    const referenceImageUrl =
      typeof request.referenceImageUrl === "string"
        ? request.referenceImageUrl
        : typeof request.referenceImage === "string"
          ? request.referenceImage
          : Array.isArray(request.referenceImages) && request.referenceImages.length > 0
            ? request.referenceImages[0]
            : typeof parameters.referenceImageUrl === "string"
              ? parameters.referenceImageUrl
              : undefined;

    const endFrameImageUrl =
      typeof parameters.endFrameImageUrl === "string" ? parameters.endFrameImageUrl : undefined;

    const generateAudio = parameters.generateAudio !== false;
    const resolution = parameters.resolution ?? request.resolution;
    let input: Record<string, unknown>;
    if (this.config.id === "kling-3") {
      input = buildKling3Input({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        aspectRatio,
        duration: parameters.duration,
        resolution,
        generateAudio,
        startImage: referenceImageUrl,
        endImage: endFrameImageUrl,
      });
    } else if (this.config.id === "seedance-2.5") {
      input = buildSeedanceInput({
        prompt: request.prompt,
        aspectRatio,
        duration: parameters.duration,
        resolution,
        generateAudio,
        startImage: referenceImageUrl,
        endImage: endFrameImageUrl,
      });
    } else {
      input = {
        prompt: request.prompt,
        duration,
        aspect_ratio: aspectRatio,
        generate_audio: generateAudio,
      };
      if (referenceImageUrl) {
        input.start_image = referenceImageUrl;
      }
      if (endFrameImageUrl) {
        input.end_image = endFrameImageUrl;
      }
    }
    const submittedDuration = typeof input.duration === "number" ? input.duration : duration;

    const prediction = await this.createPrediction(version, input);
    const result = await this.pollPrediction(prediction.id);
    const urls = this.normalizeOutputUrls(result.output);
    if (!urls.length) {
      throw new Error("Replicate returned no video outputs");
    }

    return {
      id: prediction.id,
      status: "completed",
      outputs: urls.map((url) => ({
        url,
        width: aspectRatio === "9:16" ? 720 : 1280,
        height: aspectRatio === "9:16" ? 1280 : 720,
        duration: submittedDuration,
      })),
      metrics: {
        predictTime: result.metrics?.predict_time,
      },
    };
  }
}
