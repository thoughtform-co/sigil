import { BaseModelAdapter, GenerationRequest, GenerationResponse, ModelConfig } from "@/lib/models/base";
import { NANO_BANANA_BACKUP_CONFIG, KLING_2_6_CONFIG, ReplicateAdapter } from "@/lib/models/adapters/replicate";

export const NANO_BANANA_CONFIG: ModelConfig = {
  id: "gemini-nano-banana-pro",
  name: "Nano Banana Pro",
  provider: "Google",
  type: "image",
  description: "Gemini 3 Pro Image - Advanced image generation with superior quality",
  defaultAspectRatio: "1:1",
  maxResolution: 4096,
  supportedAspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
  capabilities: {
    editing: true,
    "text-2-image": true,
    "image-2-image": true,
    multiImageEditing: true,
    maxReferenceImages: 14,
  },
};

export const VEO_3_1_CONFIG: ModelConfig = {
  id: "veo-3.1",
  name: "Veo 3.1",
  provider: "google",
  type: "video",
  description: "High quality text-to-video generation model.",
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
  },
};

export class GeminiAdapter extends BaseModelAdapter {
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);

    // Until native Gemini transport is ported, delegate to a stable Replicate route
    // so generations remain functional with API-key swapping.
    const delegateConfig = this.config.type === "video" ? KLING_2_6_CONFIG : NANO_BANANA_BACKUP_CONFIG;
    const delegate = new ReplicateAdapter(delegateConfig);
    const result = await delegate.generate(request);

    if (result.status === "completed") {
      return {
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          routedFrom: this.config.id,
          routedTo: delegateConfig.id,
        },
      };
    }

    return {
      ...result,
      error: result.error || "Gemini route failed",
    };
  }
}
