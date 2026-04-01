export interface ModelParameter {
  name: string;
  type: "string" | "number" | "select" | "boolean";
  label: string;
  default?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  type: "image" | "video";
  description: string;
  maxResolution?: number;
  defaultAspectRatio?: string;
  supportedAspectRatios?: string[];
  capabilities?: {
    editing?: boolean;
    "text-2-image"?: boolean;
    "image-2-image"?: boolean;
    "text-2-video"?: boolean;
    "image-2-video"?: boolean;
    "frame-interpolation"?: boolean;
    multiImageEditing?: boolean;
    maxReferenceImages?: number;
    audioGeneration?: boolean;
  };
  pricing?: {
    perImage?: number;
    perSecond?: number;
    currency: string;
  };
  parameters?: ModelParameter[];
}

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: number;
  numOutputs?: number;
  seed?: number;
  referenceImage?: string;
  referenceImageUrl?: string;
  referenceImages?: string[];
  beginFrame?: string;
  endFrame?: string;
  [key: string]: unknown;
}

export function collectReferenceImages(
  request: GenerationRequest,
  parameters?: Record<string, unknown>
): string[] {
  const referenceImages: string[] = [];
  const seen = new Set<string>();

  const pushReference = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    referenceImages.push(trimmed);
  };

  const pushReferenceList = (value: unknown) => {
    if (!Array.isArray(value)) return;
    value.forEach(pushReference);
  };

  pushReferenceList(request.referenceImages);
  pushReferenceList(parameters?.referenceImages);
  pushReference(request.referenceImage);
  pushReference(request.referenceImageUrl);
  pushReference(parameters?.referenceImage);
  pushReference(parameters?.referenceImageUrl);

  return referenceImages;
}

export interface GenerationResponse {
  id: string;
  status: "processing" | "completed" | "failed";
  outputs?: Array<{
    url: string;
    width: number;
    height: number;
    duration?: number;
  }>;
  error?: string;
  metadata?: Record<string, unknown>;
  metrics?: {
    predictTime?: number;
    inputTokenCount?: number;
    outputTokenCount?: number;
  };
}

export abstract class BaseModelAdapter {
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  getConfig(): ModelConfig {
    return this.config;
  }

  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;

  async checkStatus(generationId: string): Promise<GenerationResponse> {
    throw new Error(`Status checking not implemented for this model: ${generationId}`);
  }

  protected validateRequest(request: GenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error("Prompt is required");
    }
  }
}
