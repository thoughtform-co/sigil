import { BaseModelAdapter, ModelConfig } from "@/lib/models/base";
import { GeminiAdapter, NANO_BANANA_CONFIG, VEO_3_1_CONFIG } from "@/lib/models/adapters/gemini";
import {
  KLING_2_6_CONFIG,
  NANO_BANANA_BACKUP_CONFIG,
  REVE_CONFIG,
  ReplicateAdapter,
  SEEDREAM_4_CONFIG,
} from "@/lib/models/adapters/replicate";
import { KLING_OFFICIAL_CONFIG, KlingOfficialAdapter } from "@/lib/models/adapters/kling";

type AdapterCtor = new (config: ModelConfig) => BaseModelAdapter;

class ModelRegistry {
  private models: Map<string, { config: ModelConfig; adapter: AdapterCtor }>;

  constructor() {
    this.models = new Map();
    this.registerDefaultModels();
  }

  private registerDefaultModels() {
    this.register(NANO_BANANA_CONFIG, GeminiAdapter);
    this.register(VEO_3_1_CONFIG, GeminiAdapter);

    this.register(SEEDREAM_4_CONFIG, ReplicateAdapter);
    this.register(REVE_CONFIG, ReplicateAdapter);
    this.register(KLING_2_6_CONFIG, ReplicateAdapter);
    this.register(NANO_BANANA_BACKUP_CONFIG, ReplicateAdapter);

    this.register(KLING_OFFICIAL_CONFIG, KlingOfficialAdapter);
  }

  register(config: ModelConfig, adapter: AdapterCtor) {
    this.models.set(config.id, { config, adapter });
  }

  getModel(modelId: string): BaseModelAdapter | null {
    const model = this.models.get(modelId);
    if (!model) return null;
    return new model.adapter(model.config);
  }

  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values()).map((m) => m.config);
  }

  getModelsByType(type: "image" | "video"): ModelConfig[] {
    return this.getAllModels().filter((m) => m.type === type);
  }

  getModelConfig(modelId: string): ModelConfig | null {
    const model = this.models.get(modelId);
    return model ? model.config : null;
  }
}

export const modelRegistry = new ModelRegistry();

export const getModel = (modelId: string) => modelRegistry.getModel(modelId);
export const getAllModels = () => modelRegistry.getAllModels();
export const getModelsByType = (type: "image" | "video") => modelRegistry.getModelsByType(type);
export const getModelConfig = (modelId: string) => modelRegistry.getModelConfig(modelId);
