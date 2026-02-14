import { BaseModelAdapter, GenerationRequest, GenerationResponse, ModelConfig } from "@/lib/models/base";
import { ReplicateAdapter, SEEDREAM_4_CONFIG } from "@/lib/models/adapters/replicate";

export const FAL_SEEDREAM_4_CONFIG: ModelConfig = {
  id: "fal-seedream-4",
  name: "FAL Seedream 4",
  provider: "fal",
  type: "image",
  description: "FAL image model route.",
  capabilities: {
    "text-2-image": true,
  },
};

export class FalAdapter extends BaseModelAdapter {
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    // Delegate to Replicate Seedream until native FAL route is ported.
    const delegate = new ReplicateAdapter(SEEDREAM_4_CONFIG);
    const result = await delegate.generate(request);
    if (result.status === "completed") {
      return {
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          routedFrom: this.config.id,
          routedTo: SEEDREAM_4_CONFIG.id,
        },
      };
    }
    return {
      ...result,
      error: result.error || "FAL route failed",
    };
  }
}
