type ModelMode = "image" | "video" | "canvas";

type ModelLike = {
  id: string;
};

const PREFERRED_MODEL_IDS: Record<ModelMode, string[]> = {
  image: ["gemini-nano-banana-2", "gemini-nano-banana-pro", "nano-banana-backup"],
  video: ["kling-official", "veo-3.1", "gemini-veo-3.1", "kling-2.6", "replicate-kling-2.6"],
  canvas: [],
};

function getPreferenceRank(mode: ModelMode, id: string): number {
  const rank = PREFERRED_MODEL_IDS[mode].indexOf(id);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

export function pickPreferredModelId<T extends ModelLike>(items: T[], mode: ModelMode): string {
  if (!items.length) return "";
  const preferred = PREFERRED_MODEL_IDS[mode].find((id) => items.some((item) => item.id === id));
  return preferred ?? items[0]?.id ?? "";
}

export function sortModelsByPreference<T extends ModelLike>(items: T[], mode: ModelMode): T[] {
  return [...items].sort((a, b) => {
    const rankDiff = getPreferenceRank(mode, a.id) - getPreferenceRank(mode, b.id);
    if (rankDiff !== 0) return rankDiff;
    return a.id.localeCompare(b.id);
  });
}
