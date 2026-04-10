import { z } from "zod";

export const registrationQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "select", "checkbox"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

export const registrationAnswerSchema = z.object({
  questionId: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
});

export const workshopRegistrationSubmitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  vatNumber: z.string().max(50).optional(),
  answers: z.array(registrationAnswerSchema).max(20).optional(),
});

export const workshopEventCreateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(300),
  description: z.string().max(10_000).optional(),
  coverImageUrl: z.string().url().optional(),

  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  timezone: z.string().default("Europe/Brussels"),
  locationName: z.string().max(300).optional(),
  locationAddress: z.string().max(1000).optional(),
  isOnline: z.boolean().default(false),
  onlineUrl: z.string().url().optional(),

  capacity: z.number().int().positive().optional(),
  requireApproval: z.boolean().default(false),
  priceAmountCents: z.number().int().min(0).optional(),
  priceCurrency: z.string().length(3).optional(),

  workspaceProjectId: z.string().uuid().optional(),
  registrationQuestions: z.array(registrationQuestionSchema).max(20).optional(),

  hostName: z.string().max(200).optional(),
  hostAvatarUrl: z.string().url().optional(),
});

export const workshopEventUpdateSchema = workshopEventCreateSchema.partial();

export type WorkshopRegistrationSubmitInput = z.infer<typeof workshopRegistrationSubmitSchema>;
export type WorkshopEventCreateInput = z.infer<typeof workshopEventCreateSchema>;
export type WorkshopEventUpdateInput = z.infer<typeof workshopEventUpdateSchema>;
