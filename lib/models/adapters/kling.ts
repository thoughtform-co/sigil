import { createHmac } from "crypto";
import {
  BaseModelAdapter,
  GenerationRequest,
  GenerationResponse,
  ModelConfig,
} from "@/lib/models/base";

const KLING_ACCESS_KEY =
  typeof window === "undefined" ? process.env.KLING_ACCESS_KEY : null;
const KLING_SECRET_KEY =
  typeof window === "undefined" ? process.env.KLING_SECRET_KEY : null;

if (
  typeof window === "undefined" &&
  (!KLING_ACCESS_KEY || !KLING_SECRET_KEY)
) {
  console.warn(
    "KLING_ACCESS_KEY and KLING_SECRET_KEY are not set. Official Kling API will not work."
  );
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate JWT for Kling API (HS256) using Node crypto only.
 * Token valid 30 minutes.
 */
function generateKlingJWT(secretOverride?: Buffer): string {
  if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
    throw new Error("Kling API credentials not configured");
  }
  const secret =
    secretOverride ?? Buffer.from(KLING_SECRET_KEY, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: KLING_ACCESS_KEY,
    exp: now + 1800,
    nbf: now - 5,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const signatureB64 = base64UrlEncode(sig);
  return `${signingInput}.${signatureB64}`;
}

export const KLING_OFFICIAL_CONFIG: ModelConfig = {
  id: "kling-official",
  name: "Kling 2.6",
  provider: "kling",
  type: "video",
  description:
    "Official Kling 2.6 API with native audio and start/end frame interpolation.",
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
    "frame-interpolation": true,
  },
};

export class KlingOfficialAdapter extends BaseModelAdapter {
  private baseUrl = "https://api.klingai.com/v1";

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    try {
      return await this.generateVideo(request);
    } catch (err) {
      return {
        id: `error-${Date.now()}`,
        status: "failed",
        error: err instanceof Error ? err.message : "Generation failed",
      };
    }
  }

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
      throw new Error(
        "KLING_ACCESS_KEY and KLING_SECRET_KEY are not configured. " +
          "Add credentials to .env. Get keys from: https://app.klingai.com/global/dev/document-api"
      );
    }

    const parameters = (request as { parameters?: Record<string, unknown> })
      .parameters ?? {};
    const aspectRatio =
      (parameters.aspectRatio as string) || request.aspectRatio || "16:9";
    const duration = Number(parameters.duration ?? 5);
    const mode = (parameters.mode as string) || "pro";
    const generateAudio = parameters.generateAudio !== false;
    const negativePrompt = parameters.negativePrompt as string | undefined;
    const cfgScale = Number(parameters.cfgScale ?? 0.5);

    const normalizeKlingImageInput = (value: string): string => {
      if (value.startsWith("data:")) {
        const commaIndex = value.indexOf(",");
        return commaIndex === -1 ? value : value.slice(commaIndex + 1);
      }
      return value;
    };

    let startImage: string | null = null;
    if (
      typeof request.referenceImageUrl === "string" &&
      request.referenceImageUrl.startsWith("http")
    ) {
      startImage = request.referenceImageUrl;
    } else if (
      typeof request.referenceImage === "string" &&
      request.referenceImage.length > 0
    ) {
      startImage = normalizeKlingImageInput(request.referenceImage);
    } else if (
      Array.isArray(request.referenceImages) &&
      request.referenceImages.length > 0
    ) {
      startImage = normalizeKlingImageInput(request.referenceImages[0]);
    }

    const input: Record<string, unknown> = {
      model_name: "kling-v2-6",
      mode,
      prompt: request.prompt,
      cfg_scale: cfgScale,
      aspect_ratio: aspectRatio,
      duration: String(duration),
      sound: generateAudio ? "on" : "off",
    };
    if (negativePrompt) input.negative_prompt = negativePrompt;
    if (startImage) input.image = startImage;

    const endFrameImageUrl = parameters.endFrameImageUrl;
    if (typeof endFrameImageUrl === "string") {
      input.image_tail = normalizeKlingImageInput(endFrameImageUrl);
      if ((input.sound as string) === "on") {
        input.sound = "off";
      }
    }

    const token = generateKlingJWT();
    let response: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const attemptToken = attempt === 1 ? token : generateKlingJWT();
      const klingEndpoint = startImage ? "image2video" : "text2video";
      response = await fetch(`${this.baseUrl}/videos/${klingEndpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attemptToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (response.ok) break;
      const errText = await response.text();
      const isSignatureErr =
        response.status === 401 &&
        errText.toLowerCase().includes("signature");
      if (!isSignatureErr || attempt === 3) {
        throw new Error(errText || `Kling API error ${response.status}`);
      }
    }
    if (!response?.ok) {
      throw new Error("Kling API request failed");
    }

    const data = (await response.json()) as {
      code?: number;
      message?: string;
      data?: { task_id?: string; task_url?: string; taskUrl?: string };
    };
    if (data.code !== 0) {
      throw new Error(data.message ?? `API error code: ${data.code}`);
    }
    const taskId = data.data?.task_id;
    if (!taskId) {
      throw new Error("No task_id returned from Kling API");
    }

    const maxAttempts = 180;
    let attempts = 0;
    let signatureFailures = 0;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollToken = generateKlingJWT();
      const statusUrl = `${this.baseUrl}/videos/image2video?task_id=${taskId}`;
      let statusResponse = await fetch(statusUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${pollToken}` },
      });

      if (!statusResponse.ok) {
        const errMsg = await statusResponse.text();
        if (
          statusResponse.status === 401 &&
          errMsg.toLowerCase().includes("signature")
        ) {
          signatureFailures++;
          if (signatureFailures <= 20) {
            attempts++;
            continue;
          }
        }
        throw new Error(errMsg || `Status check failed: ${statusResponse.status}`);
      }
      signatureFailures = 0;

      const statusData = (await statusResponse.json()) as {
        code?: number;
        message?: string;
        data?: unknown;
      };
      if (statusData.code !== 0) {
        throw new Error(
          statusData.message ?? `Status error: ${statusData.code}`
        );
      }

      const dataField = statusData.data;
      const taskRecord =
        Array.isArray(dataField) && dataField.length > 0
          ? (dataField as Record<string, unknown>[]).find(
              (item) =>
                (item?.task_id ?? item?.taskId) !== undefined &&
                String(item?.task_id ?? item?.taskId) === String(taskId)
            ) ?? (dataField as Record<string, unknown>[])[0]
          : typeof dataField === "object" && dataField !== null
            ? (dataField as Record<string, unknown>)
            : null;

      const taskStatusRaw =
        taskRecord?.task_status ??
        taskRecord?.taskStatus ??
        taskRecord?.status ??
        taskRecord?.task_state;
      const taskStatus = typeof taskStatusRaw === "string"
        ? taskStatusRaw.toLowerCase()
        : "";

      if (
        ["succeed", "succeeded", "success", "completed"].includes(taskStatus)
      ) {
        const taskResult =
          taskRecord?.task_result ?? taskRecord?.taskResult ?? taskRecord?.result;
        const videos =
          (taskResult && typeof taskResult === "object"
            ? (taskResult as Record<string, unknown>).videos
            : null) ??
          (taskRecord && typeof taskRecord === "object"
            ? (taskRecord as Record<string, unknown>).videos
            : null);

        const findHttpUrl = (v: unknown): string | null => {
          if (typeof v === "string" && v.startsWith("http")) return v;
          if (v && typeof v === "object") {
            for (const k of ["url", "video_url", "fileUrl", "file_url"]) {
              const u = (v as Record<string, unknown>)[k];
              if (typeof u === "string" && u.startsWith("http")) return u;
            }
          }
          return null;
        };

        const videoUrl =
          Array.isArray(videos) && videos.length > 0
            ? findHttpUrl(videos[0])
            : Array.isArray(dataField)
              ? (dataField as unknown[]).find(
                  (v) => typeof v === "string" && v.startsWith("http")
                ) as string | undefined ?? null
              : null;

        if (!videoUrl) {
          throw new Error("No video URL in result");
        }

        const videoDuration =
          Array.isArray(videos) &&
          videos[0] &&
          typeof videos[0] === "object" &&
          (videos[0] as Record<string, unknown>).duration != null
            ? Number((videos[0] as Record<string, unknown>).duration)
            : duration;

        return {
          id: `kling-${Date.now()}`,
          status: "completed",
          outputs: [
            {
              url: videoUrl,
              width: aspectRatio === "9:16" ? 720 : 1280,
              height: aspectRatio === "9:16" ? 1280 : 720,
              duration: videoDuration,
            },
          ],
          metadata: { taskId, duration: videoDuration, mode },
        };
      }

      if (["failed", "error"].includes(taskStatus)) {
        const msg =
          (taskRecord?.task_status_msg as string) ??
          (taskRecord?.taskStatusMsg as string) ??
          (taskRecord?.message as string) ??
          "Video generation failed";
        throw new Error(msg);
      }

      attempts++;
    }

    throw new Error("Video generation timeout");
  }
}
