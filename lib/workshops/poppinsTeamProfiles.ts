export type PoppinsProfile = {
  name: string;
  role: string;
  context: string;
  color: string;
  initials: string;
};

export const POPPINS_PROFILES: PoppinsProfile[] = [
  {
    name: "Lucie Basch",
    role: "CEO & Co-Founder",
    context:
      "Co-founded Too Good To Go (500M+ meals saved, 120M users, 20 countries). Engineering degree + logistics MSc. Co-founded Climate House and Plantation Paris. Forbes 30 Under 30. Focus: investor narratives, press strategy, strategic scenario planning, expansion decisions.",
    color: "#FE6744",
    initials: "LB",
  },
  {
    name: "Jonas Mallisse",
    role: "COO & Co-Founder",
    context:
      "VP Global Expansion at Too Good To Go (Belgium, US, Spain). Operations and scaling specialist. Focus: ops process audits, market entry playbooks, cross-team alignment, city launch operations.",
    color: "#2E8B57",
    initials: "JM",
  },
  {
    name: "Franco Prontera",
    role: "CXO & Co-Founder",
    context:
      "Country Director Belgium at Too Good To Go. Human-centered leadership and product thinking. Focus: experience audits, feature prioritization, culture narratives, UX review.",
    color: "#241D1B",
    initials: "FP",
  },
  {
    name: "Maya Bonnet",
    role: "CMO",
    context:
      "Head of Brand & Communications at La Fourche (organic food). Digital & Innovation Manager at Moët Hennessy. Roles at Cartier and SAGUEZ & Partners. Focus: campaign concepts, brand consistency, competitive positioning, budget allocation across channels.",
    color: "#FE6744",
    initials: "MB",
  },
  {
    name: "Violaine Tardieu",
    role: "Comms & PR Director",
    context:
      "Campaign Manager at The ONE Campaign (global advocacy). 10+ years in communications. Event management, UN General Assembly experience. Focus: press pitches, crisis response, media list building, social sentiment tracking, competitor coverage monitoring.",
    color: "#C4DD05",
    initials: "VT",
  },
  {
    name: "Marie Barbare",
    role: "Marketing Manager",
    context:
      "Previously at Veepee (project management, marketing). Growth Marketing Bootcamp at Le Wagon. 6+ years in digital and brand marketing. Focus: social content batching, growth experiment design, audience segmentation, editorial planning, campaign theme structuring.",
    color: "#FEB3D2",
    initials: "MB",
  },
  {
    name: "Jotte Mallisse",
    role: "Freelancer Digital Marketing",
    context:
      "Go-to-market strategy & marketing for startups. Co-founded Zoomers creative collective. KU Leuven. Specializes in SEO, GEO, CRO, data-driven lifecycle marketing, CRM with automation and AI. Focus: SEO content briefs, CRM sequences, conversion audits, keyword gap analysis.",
    color: "#FED12F",
    initials: "JM",
  },
  {
    name: "Gaspard Houssel",
    role: "Partnership Specialist",
    context:
      "Commercial/B2B development. Trilingual: French, German, English. Strong negotiation and strategic analysis. Focus: partner pitch adaptation, objection handling, partner success stories, partnership value modeling, risk assessment.",
    color: "#D8A96D",
    initials: "GH",
  },
  {
    name: "Sybille Ranchon",
    role: "Operations Manager",
    context:
      "VC Investor at Serena (€1B+ under management). ESSEC Business School. Strategy and innovation consultancy. CFA Level 1. Co-hosts Climate Crafters Podcast. Focus: process documentation, ops cost analysis, insurance/compliance review.",
    color: "#9B59B6",
    initials: "SR",
  },
  {
    name: "Sofiya Neretina",
    role: "Customer Success",
    context:
      "Onboarding Manager at Greenly (Certified B Corp). Sorbonne Université. Customer success and relationship management. Trilingual. Focus: response templates, user onboarding flow critique, community highlights.",
    color: "#3498DB",
    initials: "SN",
  },
  {
    name: "Antoine Rey",
    role: "Front End Engineer",
    context:
      "SUPINFO. React Native developer. 32 repos on GitHub. Based in Lyon. Focus: component design, code review, React Native patterns, Poppins frontend conventions.",
    color: "#1ABC9C",
    initials: "AR",
  },
  {
    name: "Florian Lonqueu-Brochard",
    role: "Founding Engineer",
    context:
      "Senior Staff Engineer at Back Market. Lead Front-End at BlaBlaCar. Amazon Vancouver. Symfony contributor since 2012. 12+ years experience. Focus: architecture decision records, code migration planning, team convention encoding.",
    color: "#E74C3C",
    initials: "FL",
  },
  {
    name: "Antoine Henning",
    role: "Back-End Engineer",
    context:
      "Lead Full-Stack at Station F. Backend/Full-Stack at Chanel, Les Echos, Ulule, Canal+, Back Market. Python/React/TypeScript. CI/CD and DevOps. Focus: API design review, debugging, test suites, deployment automation.",
    color: "#F39C12",
    initials: "AH",
  },
];

export const POPPINS_ROLES = [
  "CEO & Co-Founder",
  "COO & Co-Founder",
  "CXO & Co-Founder",
  "CMO",
  "Comms & PR Director",
  "Marketing Manager",
  "Freelancer Digital Marketing",
  "Partnership Specialist",
  "Operations Manager",
  "Customer Success",
  "Front End Engineer",
  "Founding Engineer",
  "Back-End Engineer",
];

export function getProfileByName(name: string): PoppinsProfile | undefined {
  return POPPINS_PROFILES.find((p) => p.name === name);
}
