import type { JourneyContent } from "./types";

/**
 * Mock content for the INKROOT client journey.
 * Represents a real prompting workshop curriculum.
 */
export const INKROOT_JOURNEY: JourneyContent = {
  profile: {
    id: "inkroot-001",
    name: "INKROOT",
    clientName: "INKROOT Studio",
    subtitle: "Navigating the Latent Space",
    description:
      "A guided expedition into visual AI for INKROOT Studio. Learn to craft precise prompts, understand the geometry of meaning, and develop a creative workflow with generative AI tools.",
    facilitatorName: "Thoughtform",
    theme: {
      heroImageUrl: "/images/journey-hero-inkroot.jpg",
      accentColor: "#3D6B4F",
      gradientDirection: "bottom",
    },
    workspaceProjectId: "a9cc40da-0ccb-4ef6-abf9-fd8847318cac",
  },
  chapters: [
    {
      id: "ch-01",
      title: "Orientation",
      subtitle: "Understanding the territory",
      lessons: [
        {
          id: "les-01-01",
          title: "What is the Latent Space?",
          subtitle: "The geometry of meaning beneath AI",
          estimatedMinutes: 15,
          blocks: [
            {
              type: "narrative",
              id: "n-01",
              heading: "Everything is encoded",
              body: "Every image, every word, every sound — AI systems have compressed them into a vast geometric space where proximity means similarity. When you write a prompt, you're not commanding a tool. You're navigating coordinates in this space.\n\nThe better you understand its topology, the more precisely you can reach the images in your mind.",
            },
            {
              type: "particle-scene",
              id: "ps-01",
              title: "Explore the Latent Space",
              description:
                "Move through a simplified visualization of how concepts cluster in the latent space. Notice how related ideas orbit each other.",
              sceneType: "latent-space",
            },
            {
              type: "narrative",
              id: "n-02",
              heading: "Prompts as coordinates",
              body: 'Think of each word in your prompt as a nudge in a direction. "A forest" places you in one neighborhood. Add "at dusk" and you travel further. Add "in the style of Moebius" and you leap to an entirely different region.\n\nThe art is in learning which words move you where — and how far.',
            },
            {
              type: "quiz",
              id: "q-01",
              question: "When you add more detail to a prompt, what are you doing in the latent space?",
              options: [
                { id: "a", label: "Making the AI work harder" },
                { id: "b", label: "Narrowing your coordinates to a more specific region" },
                { id: "c", label: "Increasing the output resolution" },
              ],
              correctOptionId: "b",
              explanation:
                "Each descriptive word further constrains where in the latent space the model searches, narrowing you toward a specific visual neighborhood.",
            },
          ],
        },
        {
          id: "les-01-02",
          title: "The Anatomy of a Prompt",
          subtitle: "Subject, style, mood, and technical parameters",
          estimatedMinutes: 20,
          blocks: [
            {
              type: "narrative",
              id: "n-03",
              heading: "Four layers of a prompt",
              body: "Every effective prompt has four dimensions, whether you state them explicitly or leave them implicit:\n\n1. Subject — What are you depicting?\n2. Style — How is it rendered?\n3. Mood — What emotion or atmosphere?\n4. Technical — Camera, lighting, resolution, medium.\n\nLeaving any dimension implicit means the model fills it with its statistical average. Specificity is your steering wheel.",
            },
            {
              type: "example",
              id: "ex-01",
              imageUrl: "/images/example-forest-dusk.jpg",
              caption: "A dense boreal forest at dusk, volumetric fog between the trees, amber light filtering through the canopy, cinematic wide shot, Kodak Portra 400 film grain",
              prompt: "A dense boreal forest at dusk, volumetric fog between the trees, amber light filtering through the canopy, cinematic wide shot, Kodak Portra 400 film grain",
              layout: "full-bleed",
            },
            {
              type: "narrative",
              id: "n-04",
              body: "Notice how the prompt above covers all four layers: the forest (subject), cinematic framing (style), dusk with amber light (mood), and Kodak Portra film grain (technical). Each layer contributes a different dimension of coordinates.",
            },
            {
              type: "practice",
              id: "p-01",
              instruction:
                "Write a prompt that explicitly addresses all four layers: subject, style, mood, and technical. Try to create an image that could belong on the cover of a magazine.",
              hint: "Think about what magazine — that choice alone will shape your style and mood layers.",
              targetSessionType: "image",
            },
          ],
        },
      ],
    },
    {
      id: "ch-02",
      title: "Technique",
      subtitle: "Mastering the instruments",
      lessons: [
        {
          id: "les-02-01",
          title: "Style Transfer and References",
          subtitle: "How to guide the model with existing imagery",
          estimatedMinutes: 25,
          blocks: [
            {
              type: "narrative",
              id: "n-05",
              heading: "Beyond text: visual references",
              body: "Text prompts navigate one dimension of the latent space, but reference images navigate another. When you provide a reference image alongside your prompt, you're giving the model two sets of coordinates that it blends together.\n\nThis is especially powerful when you want to maintain a consistent visual identity across multiple outputs — exactly what brand work demands.",
            },
            {
              type: "example",
              id: "ex-02",
              imageUrl: "/images/example-style-transfer.jpg",
              caption: "Style transferred from a woodcut illustration reference onto a contemporary portrait subject",
              prompt: "Portrait of a young architect, woodcut illustration style, high contrast, dramatic shadow play, grain texture",
              layout: "inset",
            },
            {
              type: "narrative",
              id: "n-06",
              body: "The reference image doesn't override your prompt — it harmonizes with it. The model finds coordinates that satisfy both the textual description and the visual reference. Learning to balance these two inputs is one of the most valuable skills in AI-assisted creative work.",
            },
            {
              type: "practice",
              id: "p-02",
              instruction:
                "Use a reference image alongside your prompt. Try uploading an image with a strong visual style (illustration, photography, painting) and write a prompt for a completely different subject. See how the model blends the two.",
              targetSessionType: "image",
            },
            {
              type: "quiz",
              id: "q-02",
              question: "What happens when your text prompt and reference image pull in very different directions?",
              options: [
                { id: "a", label: "The model ignores the text prompt" },
                { id: "b", label: "The model finds a middle ground between the two coordinates" },
                { id: "c", label: "The output becomes completely random" },
              ],
              correctOptionId: "b",
              explanation:
                "The model blends both inputs, finding a point in the latent space that partially satisfies each. The balance depends on the model and the strength of each signal.",
            },
          ],
        },
        {
          id: "les-02-02",
          title: "Iteration and Refinement",
          subtitle: "The art of the second prompt",
          estimatedMinutes: 20,
          blocks: [
            {
              type: "narrative",
              id: "n-07",
              heading: "Your first prompt is a draft",
              body: "Professional AI work is iterative. Your first generation reveals what the model understood and where you landed in the latent space. The second prompt is where the real craft begins.\n\nStudy your output. What worked? What drifted? Adjust your coordinates — add specificity where the model guessed wrong, remove words that pushed you in an unwanted direction.",
            },
            {
              type: "example",
              id: "ex-03",
              imageUrl: "/images/example-iteration.jpg",
              caption: "Three iterations of the same concept, each refining the prompt based on the previous output",
              layout: "full-bleed",
            },
            {
              type: "practice",
              id: "p-03",
              instruction:
                "Generate an image, then iterate on it at least twice. Each time, study the output and adjust your prompt to move closer to your vision. Save all three versions.",
              hint: "Don't rewrite from scratch. Make surgical edits — add one thing, remove one thing.",
              targetSessionType: "image",
            },
          ],
        },
      ],
    },
    {
      id: "ch-03",
      title: "Application",
      subtitle: "Bringing it to your practice",
      lessons: [
        {
          id: "les-03-01",
          title: "Building a Visual Language",
          subtitle: "Consistency across a body of AI-assisted work",
          estimatedMinutes: 30,
          blocks: [
            {
              type: "narrative",
              id: "n-08",
              heading: "From single images to systems",
              body: "Creating one striking image is a starting point. The real challenge — and the real value for brand and creative work — is creating a consistent visual language that carries across dozens or hundreds of outputs.\n\nThis requires developing a personal prompt vocabulary: a set of style descriptors, technical parameters, and reference images that reliably produce outputs in your desired aesthetic territory.",
            },
            {
              type: "narrative",
              id: "n-09",
              body: "Start by identifying the outputs you love most from the exercises so far. What do they have in common? Extract the prompt patterns and build them into a reusable template. This template becomes your creative instrument — your personal coordinates in the latent space.",
              parallaxImageUrl: "/images/lesson-parallax-constellation.jpg",
              parallaxOpacity: 0.12,
            },
            {
              type: "practice",
              id: "p-04",
              instruction:
                "Create a series of 3-4 images that feel like they belong together — a cohesive visual family. Use a consistent prompt template, varying only the subject while keeping style, mood, and technical parameters stable.",
              hint: "Write your base template first. Then swap only the subject portion for each generation.",
              targetSessionType: "image",
            },
          ],
        },
      ],
    },
  ],
  resources: [
    {
      id: "res-01",
      title: "Prompt Engineering Cheatsheet",
      description: "Quick reference card for the four-layer prompt framework.",
      fileType: "pdf",
    },
    {
      id: "res-02",
      title: "Latent Space Glossary",
      description: "Key terminology for navigating AI image generation.",
      fileType: "pdf",
    },
    {
      id: "res-03",
      title: "Thoughtform Platform Guide",
      description: "How to use the Sigil creation workspace: sessions, waypoints, and outputs.",
      fileType: "link",
      externalUrl: "/documentation",
    },
    {
      id: "res-04",
      title: "Style Reference Library",
      description: "Curated collection of reference images for common style transfers.",
      fileType: "link",
    },
  ],
};

/**
 * Registry of all available journey content.
 * Keyed by WorkspaceProject ID (empty string for unmapped prototypes).
 */
const journeyContentByProfile: Record<string, JourneyContent> = {
  [INKROOT_JOURNEY.profile.id]: INKROOT_JOURNEY,
};

export function getJourneyContent(profileId: string): JourneyContent | null {
  return journeyContentByProfile[profileId] ?? null;
}

export function getJourneyContentByWorkspaceId(workspaceProjectId: string): JourneyContent | null {
  return Object.values(journeyContentByProfile).find(
    (j) => j.profile.workspaceProjectId === workspaceProjectId
  ) ?? null;
}

export function getAllJourneyContent(): JourneyContent[] {
  return Object.values(journeyContentByProfile);
}

/** Flat list of all lessons across all chapters */
export function getAllLessons(content: JourneyContent) {
  return content.chapters.flatMap((ch) => ch.lessons);
}

/** Find a specific lesson by ID */
export function findLesson(content: JourneyContent, lessonId: string) {
  for (const ch of content.chapters) {
    const lesson = ch.lessons.find((l) => l.id === lessonId);
    if (lesson) return { chapter: ch, lesson };
  }
  return null;
}
