/** Shared types for generation UI and API contracts. */

export type GenerationType = "image" | "video" | "canvas";

export type SessionItem = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  thumbnailUrl?: string | null;
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
  sessionId?: string;
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs: OutputItem[];
  source?: string;
  workflowExecutionId?: string | null;
  errorMessage?: string | null;
  errorCategory?: string | null;
  errorRetryable?: boolean | null;
  lastHeartbeatAt?: string | null;
};

export type ModelItem = {
  id: string;
  name: string;
  type: "image" | "video";
  provider: string;
};
