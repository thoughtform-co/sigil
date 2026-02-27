/**
 * Content model for the Sigil learning layer.
 * UI-only for now — intentionally portable to a future DB/CMS backend.
 */

// ---------------------------------------------------------------------------
// Journey profile
// ---------------------------------------------------------------------------

export type JourneyTheme = {
  heroImageUrl?: string;
  accentColor?: string; // hex, e.g. "#3D6B4F" — overrides --gold locally
  gradientDirection?: "top" | "bottom" | "left" | "right";
};

export type JourneyProfile = {
  id: string;
  name: string;
  clientName: string;
  subtitle?: string;
  description: string;
  facilitatorName: string;
  theme: JourneyTheme;
  /** Existing WorkspaceProject ID this learning layer maps to */
  workspaceProjectId: string;
};

// ---------------------------------------------------------------------------
// Curriculum structure
// ---------------------------------------------------------------------------

export type Chapter = {
  id: string;
  title: string;
  subtitle?: string;
  lessons: Lesson[];
};

export type Lesson = {
  id: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  blocks: ContentBlock[];
};

// ---------------------------------------------------------------------------
// Content blocks — discriminated union
// ---------------------------------------------------------------------------

export type NarrativeBlock = {
  type: "narrative";
  id: string;
  heading?: string;
  body: string; // supports markdown-like line breaks
  parallaxImageUrl?: string;
  parallaxOpacity?: number;
};

export type ExampleBlock = {
  type: "example";
  id: string;
  imageUrl: string;
  caption: string;
  prompt?: string; // the prompt that was used
  layout?: "full-bleed" | "inset";
};

export type PracticeBlock = {
  type: "practice";
  id: string;
  instruction: string;
  hint?: string;
  /** Route (Project) ID where practice outputs land */
  targetRouteId?: string;
  /** Session type to create/use for practice outputs */
  targetSessionType?: "image" | "video";
};

export type QuizBlock = {
  type: "quiz";
  id: string;
  question: string;
  options: { id: string; label: string }[];
  correctOptionId?: string; // optional — can be reflection-only
  explanation?: string;
};

export type ParticleSceneBlock = {
  type: "particle-scene";
  id: string;
  title: string;
  description: string;
  sceneType: "latent-space" | "prompt-navigation" | "semantic-cluster";
};

export type ContentBlock =
  | NarrativeBlock
  | ExampleBlock
  | PracticeBlock
  | QuizBlock
  | ParticleSceneBlock;

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type Resource = {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileType?: string; // "pdf" | "image" | "video" | "link"
  externalUrl?: string;
};

// ---------------------------------------------------------------------------
// Full journey content bundle
// ---------------------------------------------------------------------------

export type JourneyContent = {
  profile: JourneyProfile;
  chapters: Chapter[];
  resources: Resource[];
};
