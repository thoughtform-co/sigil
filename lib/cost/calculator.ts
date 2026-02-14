import { ModelConfig } from "@/lib/models/base";

type CostInput = {
  model: ModelConfig;
  outputCount: number;
  predictTimeSeconds?: number;
  outputHasVideo?: boolean;
};

const IMAGE_MODEL_COST: Record<string, number> = {
  "seedream-4": 0.04,
  reve: 0.04,
  "nano-banana-backup": 0.04,
  "gemini-2.5-flash-image": 0.04,
  "fal-seedream-4": 0.04,
};

const VIDEO_PER_SECOND_COST: Record<string, number> = {
  "kling-2.6": 0.01,
  "kling-official": 0.01,
  "veo-3.1": 0.02,
};

export function calculateGenerationCost({
  model,
  outputCount,
  predictTimeSeconds,
  outputHasVideo,
}: CostInput): number {
  if (outputHasVideo || model.type === "video") {
    const perSecond = VIDEO_PER_SECOND_COST[model.id] ?? 0.01;
    const seconds = Math.max(1, predictTimeSeconds ?? 5);
    return Number((perSecond * seconds).toFixed(6));
  }

  const perImage = IMAGE_MODEL_COST[model.id] ?? 0.04;
  return Number((perImage * Math.max(1, outputCount)).toFixed(6));
}
