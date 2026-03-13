import type { GenerationRequest } from "@/lib/models/base";

/**
 * Single source of truth for building adapter GenerationRequest from DB generation row.
 * Keeps parameter normalization (referenceImageUrl, etc.) in one place.
 */
export function normalizeGenerationRequest(
  prompt: string,
  negativePrompt: string | null,
  parameters: Record<string, unknown>
): GenerationRequest {
  const params = parameters ?? {};
  const referenceImages = Array.isArray(params.referenceImages)
    ? params.referenceImages.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const referenceImageUrl = typeof params.referenceImageUrl === "string"
    ? params.referenceImageUrl
    : referenceImages[0];

  return {
    prompt,
    negativePrompt: negativePrompt ?? undefined,
    ...params,
    parameters: params,
    referenceImage: referenceImageUrl,
    referenceImageUrl: referenceImageUrl,
    referenceImages:
      referenceImages.length > 0
        ? referenceImages
        : referenceImageUrl
          ? [referenceImageUrl]
          : undefined,
  };
}
