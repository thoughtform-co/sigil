import { BaseModelAdapter, GenerationRequest, GenerationResponse, ModelConfig } from "@/lib/models/base";

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

    const referenceImage =
      typeof parameters.referenceImage === "string"
        ? parameters.referenceImage
        : typeof parameters.referenceImageUrl === "string"
          ? parameters.referenceImageUrl
          : undefined;

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
      if (referenceImage) {
        input.image_input = [referenceImage];
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

    const input: Record<string, unknown> = {
      prompt: request.prompt,
      duration,
      aspect_ratio: aspectRatio,
      generate_audio: parameters.generateAudio !== false,
    };
    if (referenceImageUrl) {
      input.start_image = referenceImageUrl;
    }
    if (endFrameImageUrl) {
      input.end_image = endFrameImageUrl;
    }

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
        duration,
      })),
      metrics: {
        predictTime: result.metrics?.predict_time,
      },
    };
  }
}
