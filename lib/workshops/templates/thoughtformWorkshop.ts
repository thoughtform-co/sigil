import type { BrandedJourneySettings } from "../types";

export const POPPINS_LOGO_SVG = `<svg viewBox="129 45 370 75" fill="none" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:auto"><path d="M129.503 114.878V62.593h14.717v5.748h.281c4.15-5.179 9.905-7.54 16.412-7.54 14.9 0 25.466 12.156 25.466 28.451 0 14.883-10.468 27.411-25.466 27.411-6.127 0-11.509-1.883-15.751-6.5v22.141h-15.659zm41.216-26.097c0-7.35-5.655-13.379-13.204-13.379-7.168 0-13.014 5.839-13.014 13.379 0 7.35 5.656 13.281 13.113 13.281 7.45.007 13.105-5.972 13.105-13.281z" fill="currentColor"/><path d="M219.766 116.48c-15.941 0-28.203-11.777-28.203-27.79 0-16.204 12.543-27.791 28.203-27.791s28.202 11.776 28.202 27.81c0 16.393-12.451 27.98-28.202 27.98zm12.543-27.79c0-6.97-5.283-13.19-12.642-13.19-6.887 0-12.451 6.03-12.451 13.19s5.473 13.189 12.543 13.189c7.365 0 12.55-6.219 12.55-13.19z" fill="currentColor"/><path d="M253.349 114.878V62.593h14.717v5.748h.281c4.15-5.179 9.905-7.54 16.412-7.54 14.9 0 25.466 12.156 25.466 28.451 0 14.883-10.468 27.411-25.466 27.411-6.127 0-11.509-1.883-15.751-6.5v22.141h-15.659zm41.217-26.097c0-7.35-5.656-13.379-13.205-13.379-7.168 0-13.014 5.839-13.014 13.379 0 7.35 5.656 13.281 13.114 13.281 7.45.007 13.105-5.972 13.105-13.281z" fill="currentColor"/><path d="M315.614 114.878V62.593h14.716v5.748h.282c4.15-5.179 9.905-7.54 16.412-7.54 14.9 0 25.466 12.156 25.466 28.451 0 14.883-10.468 27.411-25.466 27.411-6.127 0-11.509-1.883-15.751-6.5v22.141h-15.659zm41.216-26.097c0-7.35-5.656-13.379-13.204-13.379-7.168 0-13.014 5.839-13.014 13.379 0 7.35 5.656 13.281 13.113 13.281 7.45.007 13.105-5.972 13.105-13.281z" fill="currentColor"/><path d="M378.068 57.035V45.167h15.659v11.868h-15.659zm0 57.843V62.593h15.659v52.285h-15.659z" fill="currentColor"/><path d="M434.156 114.878V85.865c0-7.069-2.455-10.364-8.202-10.364-6.318 0-8.963 3.485-8.963 10.554v28.83h-15.659V62.6h14.618v5.558h.19c3.299-5.369 7.921-7.35 14.238-7.35 9.434 0 19.43 5.277 19.43 20.729v33.348h-15.652v-.007z" fill="currentColor"/><path d="M481.704 77.293c-.091-3.014-2.265-3.956-4.812-3.956-2.638 0-4.53 1.511-4.53 3.485 0 2.825 2.547 4.237 9.807 6.12 12.451 3.296 16.503 8.291 16.503 15.923 0 10.926-9.434 17.806-21.315 17.806-11.79 0-20.183-6.689-21.315-17.335h15.56c.472 3.296 2.828 4.807 5.945 4.807 2.736 0 5.473-1.602 5.473-4.055 0-2.923-1.794-4.427-9.624-6.879-13.204-4.054-16.693-9.233-16.693-15.353 0-10.364 9.715-17.054 20.281-17.054 11.319 0 19.331 6.219 20.091 16.485h-15.371v.007z" fill="currentColor"/></svg>`;

/**
 * Default Poppins workshop settings -- first branded client config.
 * Derived from workshop-poppins-v2.html and the thoughtform-workshop skill.
 */
export const POPPINS_DEFAULTS: BrandedJourneySettings = {
  templateId: "thoughtform-workshop",
  branding: {
    clientName: "Poppins",
    accentColor: "#FE6744",
    secondaryColor: "#C4DD05",
    backgroundBase: "#FCF3EC",
    darkColor: "#241D1B",
    fontFamily: "'Poppins', sans-serif",
    monoFontFamily: "'JetBrains Mono', monospace",
  },
  hub: {
    heroTagline: "AI is not a tool to command. It's an intelligence to navigate.",
    subtitle: "Navigate \u2192 Encode \u2192 Accelerate",
    facilitatorName: "Thoughtform",
    workshopDate: "March 18, 2026",
  },
  agenda: {
    chapters: [
      {
        id: "foundation",
        title: "Foundation",
        subtitle: "The shift and the loop",
        tint: undefined,
        sections: [
          { id: "hero", title: "The Shift", type: "chapter-title" },
          { id: "loop", title: "The Loop", type: "content" },
        ],
      },
      {
        id: "navigate",
        title: "Navigate",
        subtitle: "How to steer a possibility space",
        tint: "#f7f9e6",
        sections: [
          { id: "nav-chapter", title: "Navigate", type: "chapter-title" },
          { id: "nav-story", title: "Navigate Story", type: "interactive" },
        ],
      },
      {
        id: "encode",
        title: "Encode",
        subtitle: "How to scaffold knowledge",
        tint: "#fcf0f5",
        sections: [
          { id: "enc-chapter", title: "Encode", type: "chapter-title" },
          { id: "enc-context", title: "Context is Everything", type: "content" },
          { id: "enc-system", title: "System Prompts", type: "content" },
          { id: "enc-projects", title: "Projects", type: "content" },
          { id: "enc-skills", title: "Skills", type: "content" },
          { id: "enc-memory", title: "Memory", type: "content" },
        ],
      },
      {
        id: "accelerate",
        title: "Accelerate",
        subtitle: "How to force-multiply your team",
        tint: "#fef0eb",
        sections: [
          { id: "acc-chapter", title: "Accelerate", type: "chapter-title" },
          { id: "acc-cowork", title: "Cowork", type: "content" },
          { id: "acc-build", title: "Software for Few", type: "content" },
          { id: "acc-team", title: "Your Team\u2019s Profiles", type: "content" },
        ],
      },
      {
        id: "close",
        title: "Close",
        subtitle: "The expanded light cone",
        sections: [
          { id: "synthesis", title: "The Flow", type: "content" },
          { id: "closing", title: "Three Questions", type: "closing" },
        ],
      },
    ],
  },
  team: [
    { name: "Maya", role: "Marketing", initials: "M", color: "#FE6744", description: "Budget allocation across channels. Historical performance analysis.", skillIdea: "Marketing budget optimizer" },
    { name: "Violaine", role: "Media Analyst", initials: "V", color: "#C4DD05", description: "Social sentiment tracking. Competitor coverage monitoring.", skillIdea: "Social listening & pattern detection" },
    { name: "Jonas", role: "City Health", initials: "J", color: "#2E8B57", description: "Neighborhood metrics aggregation. Health trends over time.", skillIdea: "City health data synth" },
    { name: "Marie", role: "Content Lead", initials: "M", color: "#FEB3D2", description: "Editorial planning. Campaign theme structuring.", skillIdea: "Content calendar builder" },
    { name: "Gaspard", role: "Partnerships", initials: "G", color: "#D8A96D", description: "Partnership value modeling. Risk assessment.", skillIdea: "Partnership ROI evaluator" },
    { name: "Jotte", role: "Growth", initials: "J", color: "#FED12F", description: "Keyword gap analysis. Competitor intel.", skillIdea: "SEO opportunity mapper" },
  ],
  resources: [
    { title: "Claude Projects", url: "https://support.claude.com/en/articles/9519177", type: "link" },
    { title: "Agent Skills (open standard)", url: "https://agentskills.io", type: "link" },
  ],
};
