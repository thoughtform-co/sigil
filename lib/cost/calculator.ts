/**
 * What a generation cost, as an estimate in USD. The figures are the providers' list prices as
 * Vesper holds them (tensalir/Loop-Vesper, src/lib/models/pricing.ts and src/lib/cost), with the
 * date each was read. They are for spend summaries and allowances, never an invoice.
 */

import { ModelConfig } from "@/lib/models/base";
import { kling3Mode } from "@/lib/models/adapters/replicate";

type CostInput = {
  model: ModelConfig;
  outputCount: number;
  predictTimeSeconds?: number;
  outputHasVideo?: boolean;
  /** Seconds of video that came back, summed over the outputs. */
  videoSeconds?: number;
  /** The resolution asked for: a number (1024, 1080) or a label ("2K", "1080p", "4k"). */
  resolution?: unknown;
  /** Video with sound, where the price differs. Default true, as in the adapters. */
  generateAudio?: boolean;
};

/**
 * Google's image models, per image by output resolution (long edge in pixels).
 * Source: https://ai.google.dev/gemini-api/docs/pricing, read 2026-09-24 (in Vesper).
 * Until 2026-10-13 Sigil priced Nano Banana Pro at $0.04, about a third of its real price.
 */
const GEMINI_IMAGE_PRICES_USD: Record<string, Record<number, number>> = {
  "gemini-nano-banana-pro": { 1024: 0.134, 2048: 0.134, 4096: 0.24 },
  "gemini-nano-banana-2": { 512: 0.045, 1024: 0.067, 2048: 0.101, 4096: 0.151 },
};

const IMAGE_MODEL_COST: Record<string, number> = {
  "seedream-4": 0.04,
  reve: 0.04,
  // google/nano-banana-pro on Replicate: priced as the Google model it stands in for.
  "nano-banana-backup": 0.134,
  "fal-seedream-4": 0.04,
  // gpt-image-2 at medium quality, 1024x1024; billed by tokens, so this is representative.
  "openai-gpt-image-2": 0.053,
};

/** Kling 3.0 on Replicate, per second of output by mode and audio. Read 2026-10-12 (in Vesper). */
const KLING_3_PRICES_USD = {
  standard: { silent: 0.168, audio: 0.252 },
  pro: { silent: 0.224, audio: 0.336 },
  "4k": { silent: 0.42, audio: 0.42 },
} as const;

/** Seedance 2.5 on Replicate, per second of output, without video input. Verified August 2026 (in Vesper). */
const SEEDANCE_PRICES_USD = { "480p": 0.1028, "720p": 0.2312 } as const;

const VIDEO_PER_SECOND_COST: Record<string, number> = {
  "kling-2.6": 0.01,
  "kling-official": 0.01,
  // Vesper's working figure for Veo 3.1; not checked against Google's sheet.
  "veo-3.1": 0.05,
};

function resolutionLines(resolution: unknown): number | null {
  if (typeof resolution === "number" && Number.isFinite(resolution)) return resolution;
  if (typeof resolution !== "string") return null;
  const label = resolution.trim().toUpperCase();
  if (label === "0.5K") return 512;
  const k = label.match(/^(\d)K$/);
  if (k) return Number(k[1]) * 1024;
  const n = parseInt(label, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** One image from a Google model; an unknown resolution is priced at 1K, between tiers at the next one up. */
function geminiImagePriceUsd(modelId: string, resolution: unknown): number | null {
  const table = GEMINI_IMAGE_PRICES_USD[modelId];
  if (!table) return null;
  const lines = resolutionLines(resolution) ?? 1024;
  const tiers = Object.keys(table).map(Number).sort((a, b) => a - b);
  return table[tiers.find((tier) => tier >= lines) ?? tiers[tiers.length - 1]];
}

export function calculateGenerationCost({
  model,
  outputCount,
  predictTimeSeconds,
  outputHasVideo,
  videoSeconds,
  resolution,
  generateAudio,
}: CostInput): number {
  const round = (value: number) => Number(value.toFixed(6));

  if (outputHasVideo || model.type === "video") {
    // Video is billed by the seconds that came back; compute time is only a stand-in.
    const seconds = Math.max(1, videoSeconds ?? predictTimeSeconds ?? 5);
    if (model.id === "kling-3") {
      const prices = KLING_3_PRICES_USD[kling3Mode(resolution)];
      return round((generateAudio === false ? prices.silent : prices.audio) * seconds);
    }
    if (model.id === "seedance-2.5") {
      const lines = resolutionLines(resolution);
      return round(SEEDANCE_PRICES_USD[lines !== null && lines <= 480 ? "480p" : "720p"] * seconds);
    }
    return round((VIDEO_PER_SECOND_COST[model.id] ?? 0.01) * seconds);
  }

  const perImage = geminiImagePriceUsd(model.id, resolution) ?? IMAGE_MODEL_COST[model.id] ?? 0.04;
  return round(perImage * Math.max(1, outputCount));
}
