import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POPPINS_SETTINGS = {
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
    heroTagline: "AI is not a tool to command. It\u2019s an intelligence to navigate.",
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

async function main() {
  const journey = await prisma.workspaceProject.create({
    data: {
      name: "Poppins \u00d7 Thoughtform",
      description: "AI Workshop \u2014 Navigate, Encode, Accelerate. A hands-on session for the Poppins marketing and communications team.",
      type: "branded",
      settings: POPPINS_SETTINGS,
    },
  });

  console.log(`Created branded journey: ${journey.id}`);
  console.log(`Name: ${journey.name}`);
  console.log(`Type: ${journey.type}`);
  console.log(`\nOpen the hub at:    /journeys/${journey.id}`);
  console.log(`Open the workshop:  /journeys/${journey.id}/workshop`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
