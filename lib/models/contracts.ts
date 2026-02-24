import { z } from "zod";

const allowedParameterValue = z.union([
  z.string().max(10000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(5000)).max(20),
]);

export const generateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modelId: z.string().min(1).max(128),
  prompt: z.string().min(1).max(50000),
  negativePrompt: z.string().max(50000).optional(),
  parameters: z
    .record(z.string().max(128), allowedParameterValue)
    .default({})
    .refine((p) => Object.keys(p).length <= 64, { message: "Too many parameters" }),
  source: z.enum(["session", "workflow"]).optional(),
  workflowExecutionId: z.string().uuid().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const processRequestSchema = z.object({
  generationId: z.string().uuid(),
});

export type ProcessRequest = z.infer<typeof processRequestSchema>;
