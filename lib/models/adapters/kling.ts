import { BaseModelAdapter, GenerationRequest, GenerationResponse, ModelConfig } from "@/lib/models/base";
import { KLING_2_6_CONFIG, ReplicateAdapter } from "@/lib/models/adapters/replicate";

export const KLING_OFFICIAL_CONFIG: ModelConfig = {
  id: "kling-official",
  name: "Kling Official API",
  provider: "kling",
  type: "video",
  description: "Official Kling API route.",
  capabilities: {
    "text-2-video": true,
    "image-2-video": true,
    "frame-interpolation": true,
  },
};

export class KlingOfficialAdapter extends BaseModelAdapter {
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    // Delegate to Replicate Kling while official signing/auth flow is ported.
    const delegate = new ReplicateAdapter(KLING_2_6_CONFIG);
    const result = await delegate.generate(request);
    if (result.status === "completed") {
      return {
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          routedFrom: this.config.id,
          routedTo: KLING_2_6_CONFIG.id,
        },
      };
    }
    return {
      ...result,
      error: result.error || "Kling official route failed",
    };
  }
}
