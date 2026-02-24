/** Shared types for generation UI and API contracts. */

export type GenerationType = "image" | "video";

export type SessionItem = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
};

export type OutputItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  isApproved?: boolean;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type GenerationItem = {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs: OutputItem[];
};

export type ModelItem = {
  id: string;
  name: string;
  type: "image" | "video";
  provider: string;
};
