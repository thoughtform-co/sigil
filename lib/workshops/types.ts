import { z } from "zod";

/**
 * Branded workshop settings persisted in WorkspaceProject.settings JSON.
 * Kept deliberately narrow for v1 — enough to ship a Poppins-style branded
 * workshop without inventing a full CMS.
 */

export const brandedBrandingSchema = z.object({
  clientName: z.string().min(1),
  logoUrl: z.string().optional(),
  heroImageUrl: z.string().optional(),
  accentColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  monoFontFamily: z.string().optional(),
  backgroundBase: z.string().optional(),
  darkColor: z.string().optional(),
});

export const brandedTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  initials: z.string().max(2),
  color: z.string().optional(),
  skillIdea: z.string().optional(),
  description: z.string().optional(),
});

export const brandedChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  tint: z.string().optional(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["content", "exercise", "interactive", "chapter-title", "closing"]).default("content"),
    }),
  ).default([]),
});

export const brandedResourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
});

export const brandedJourneySettingsSchema = z.object({
  templateId: z.string().default("thoughtform-workshop"),
  branding: brandedBrandingSchema,
  hub: z.object({
    subtitle: z.string().optional(),
    facilitatorName: z.string().optional(),
    workshopDate: z.string().optional(),
    heroTagline: z.string().optional(),
  }).default({}),
  agenda: z.object({
    chapters: z.array(brandedChapterSchema).default([]),
  }).default({}),
  team: z.array(brandedTeamMemberSchema).default([]),
  resources: z.array(brandedResourceSchema).default([]),
});

export type BrandedBranding = z.infer<typeof brandedBrandingSchema>;
export type BrandedTeamMember = z.infer<typeof brandedTeamMemberSchema>;
export type BrandedChapter = z.infer<typeof brandedChapterSchema>;
export type BrandedResource = z.infer<typeof brandedResourceSchema>;
export type BrandedJourneySettings = z.infer<typeof brandedJourneySettingsSchema>;

export function parseBrandedSettings(raw: unknown): BrandedJourneySettings | null {
  const result = brandedJourneySettingsSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function defaultBrandedSettings(): BrandedJourneySettings {
  return {
    templateId: "thoughtform-workshop",
    branding: { clientName: "" },
    hub: {},
    agenda: { chapters: [] },
    team: [],
    resources: [],
  };
}
