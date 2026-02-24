/**
 * Generation status values and allowed transitions.
 * Keeps status handling consistent across routes and process flow.
 */

export const GENERATION_STATUS = {
  PROCESSING: "processing",
  PROCESSING_LOCKED: "processing_locked",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type GenerationStatusValue = (typeof GENERATION_STATUS)[keyof typeof GENERATION_STATUS];

const ALLOWED_TRANSITIONS: Record<string, GenerationStatusValue[]> = {
  [GENERATION_STATUS.PROCESSING]: [GENERATION_STATUS.PROCESSING_LOCKED, GENERATION_STATUS.FAILED],
  [GENERATION_STATUS.PROCESSING_LOCKED]: [GENERATION_STATUS.COMPLETED, GENERATION_STATUS.FAILED],
  [GENERATION_STATUS.COMPLETED]: [],
  [GENERATION_STATUS.FAILED]: [],
};

export function canTransitionFrom(current: string, next: GenerationStatusValue): boolean {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

export function isProcessable(status: string): boolean {
  return status === GENERATION_STATUS.PROCESSING || status === GENERATION_STATUS.PROCESSING_LOCKED;
}
