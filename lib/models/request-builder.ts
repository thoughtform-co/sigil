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
  const referenceImageUrl =
    typeof params.referenceImageUrl === "string" ? params.referenceImageUrl : undefined;

  return {
    prompt,
    negativePrompt: negativePrompt ?? undefined,
    ...params,
    parameters: params,
    referenceImage: referenceImageUrl,
    referenceImageUrl: referenceImageUrl,
    referenceImages: referenceImageUrl ? [referenceImageUrl] : undefined,
  };
}
