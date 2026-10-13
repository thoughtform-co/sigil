import { describe, expect, it } from "vitest";
import { calculateGenerationCost } from "@/lib/cost/calculator";
import { getModelConfig } from "@/lib/models/registry";

const model = (id: string) => {
  const config = getModelConfig(id);
  if (!config) throw new Error(`no model ${id}`);
  return config;
};

describe("what a generation is estimated to cost", () => {
  it("prices Google's image models by resolution, at Google's list price", () => {
    const pro = model("gemini-nano-banana-pro");
    expect(calculateGenerationCost({ model: pro, outputCount: 1 })).toBe(0.134);
    expect(calculateGenerationCost({ model: pro, outputCount: 3, resolution: 2048 })).toBe(0.402);
    expect(calculateGenerationCost({ model: pro, outputCount: 1, resolution: "4K" })).toBe(0.24);
    const flash = model("gemini-nano-banana-2");
    expect(calculateGenerationCost({ model: flash, outputCount: 2 })).toBe(0.134);
    expect(calculateGenerationCost({ model: flash, outputCount: 1, resolution: 1500 })).toBe(0.101);
  });

  it("keeps the other image models at their per-image figure", () => {
    expect(calculateGenerationCost({ model: model("openai-gpt-image-2"), outputCount: 2 })).toBe(0.106);
    expect(calculateGenerationCost({ model: model("seedream-4"), outputCount: 1 })).toBe(0.04);
  });

  it("prices video by the seconds that came back", () => {
    expect(calculateGenerationCost({ model: model("veo-3.1"), outputCount: 1, videoSeconds: 8 })).toBe(0.4);
    const kling = model("kling-3");
    expect(calculateGenerationCost({ model: kling, outputCount: 1, videoSeconds: 10, resolution: "1080p" })).toBe(3.36);
    expect(
      calculateGenerationCost({ model: kling, outputCount: 1, videoSeconds: 10, resolution: "720p", generateAudio: false }),
    ).toBe(1.68);
    expect(calculateGenerationCost({ model: model("seedance-2.5"), outputCount: 1, videoSeconds: 5, resolution: "720p" })).toBe(1.156);
  });
});
