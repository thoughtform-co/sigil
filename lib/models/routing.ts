type RoutingResult = {
  modelId: string;
  routed: boolean;
  reason?: string;
};

const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY);
const hasFalKey = () => Boolean(process.env.FAL_KEY);
const hasKlingKeys = () => Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY);

export function routeModel(modelId: string): RoutingResult {
  if (modelId === "gemini-2.5-flash-image" && !hasGeminiKey()) {
    return {
      modelId: "nano-banana-backup",
      routed: true,
      reason: "GEMINI_API_KEY missing, routed to Replicate backup image model",
    };
  }

  if (modelId === "veo-3.1" && !hasGeminiKey()) {
    return {
      modelId: "kling-2.6",
      routed: true,
      reason: "GEMINI_API_KEY missing, routed to Replicate video model",
    };
  }

  if (modelId === "fal-seedream-4" && !hasFalKey()) {
    return {
      modelId: "seedream-4",
      routed: true,
      reason: "FAL_KEY missing, routed to Replicate Seedream",
    };
  }

  if (modelId === "kling-official" && !hasKlingKeys()) {
    return {
      modelId: "kling-2.6",
      routed: true,
      reason: "Kling official keys missing, routed to Replicate Kling",
    };
  }

  return { modelId, routed: false };
}
