/**
 * Rich per-person Poppins use-case data for the workshop Skills, Cowork, and
 * Software-for-Few sections. Keyed by the same names used in POPPINS_PROFILES
 * so components can look up extra detail without touching the shared schema.
 *
 * Source: poppins-team-use-cases.md (Thoughtform, March 2026)
 */

export type SkillIdea = { slug: string; description: string };
export type CoworkIdea = { title: string; description: string };
export type SoftwareIdea = { title: string; description: string };

export type PoppinsUseCase = {
  name: string;
  role: string;
  background: string;
  skills: SkillIdea[];
  cowork: CoworkIdea[];
  softwareForFew: SoftwareIdea[];
};

export const POPPINS_USE_CASES: PoppinsUseCase[] = [
  {
    name: "Lucie Basch",
    role: "CEO & Co-Founder",
    background:
      "Co-founded Too Good To Go (500M+ meals saved, 120M users, 20 countries). Engineering degree + Cranfield logistics MSc. Forbes 30 Under 30.",
    skills: [
      {
        slug: "poppins-investor-update",
        description:
          "Raw metrics + notes \u2192 structured investor update with narrative, KPIs, and forward-looking section. Maintains Lucie\u2019s voice: direct, impact-first, no corporate fluff.",
      },
      {
        slug: "poppins-founder-comms",
        description:
          "Internal all-hands drafts, team milestone announcements, culture-setting messages. Warm but purposeful.",
      },
    ],
    cowork: [
      {
        title: "Weekly board prep",
        description:
          "Drop raw data files into a folder \u2192 formatted board deck summary with key metrics, narrative highlights, and risk flags.",
      },
      {
        title: "PR monitoring",
        description:
          "Scheduled task that searches for Poppins mentions, sharing economy news, and competitor moves \u2192 morning briefing every Monday.",
      },
    ],
    softwareForFew: [
      {
        title: "Expansion Decision Engine",
        description:
          "Takes a target city, scrapes demographic data, maps competitor presence, and scores expansion readiness.",
      },
      {
        title: "Investor Q&A Prep Tool",
        description:
          "Feed it the latest metrics deck \u2192 generates the 20 hardest investor questions with suggested answers grounded in real data.",
      },
    ],
  },
  {
    name: "Jonas Mallisse",
    role: "COO & Co-Founder",
    background:
      "VP Global Expansion at Too Good To Go (Belgium, US, Spain). Louvain School of Management. Operations and scaling specialist.",
    skills: [
      {
        slug: "poppins-ops-playbook",
        description:
          "City launch operational checklist: logistics, partnerships, support setup, local regulations, team allocation.",
      },
      {
        slug: "poppins-process-optimizer",
        description:
          "Takes a process description \u2192 outputs streamlined version with automation candidates flagged.",
      },
    ],
    cowork: [
      {
        title: "Weekly ops dashboard",
        description:
          "Folder with CSVs from different city operations \u2192 synthesized report comparing cities on key metrics.",
      },
      {
        title: "Partner onboarding tracker",
        description:
          "Reads partner pipeline docs and flags stalled conversations or missing follow-ups.",
      },
    ],
    softwareForFew: [
      {
        title: "City Health Dashboard",
        description:
          "Pulls key metrics per city (CSV exports) and generates a visual comparison dashboard. Tracks expansion velocity and supply/demand balance.",
      },
      {
        title: "Ops Bottleneck Detector",
        description:
          "Analyzes support ticket exports + transaction data to identify operational friction points before they become problems.",
      },
    ],
  },
  {
    name: "Franco Prontera",
    role: "CXO & Co-Founder",
    background:
      "Country Director Belgium at Too Good To Go. Antwerp Management School. Human-centered leadership and product thinking.",
    skills: [
      {
        slug: "poppins-ux-review",
        description:
          "Takes screenshots or flow descriptions \u2192 structured UX feedback, filtered through \u201cmake sharing feel obvious\u201d lens.",
      },
      {
        slug: "poppins-feature-brief",
        description:
          "Generates product briefs from rough notes: problem statement, proposed solution, success metrics, edge cases.",
      },
    ],
    cowork: [
      {
        title: "User feedback synthesis",
        description:
          "Folder with app reviews, support transcripts, user research notes \u2192 weekly insight report grouped by theme.",
      },
      {
        title: "Design critique prep",
        description:
          "Drop mockups into folder \u2192 structured critique notes ready for design review.",
      },
    ],
    softwareForFew: [
      {
        title: "User Sentiment Tracker",
        description:
          "Ingests app store reviews + NPS data \u2192 tracks sentiment trends, flags emerging issues, correlates with releases.",
      },
      {
        title: "Item Story Generator",
        description:
          "Tracks an item\u2019s journey across borrowers \u2014 \u201cthis drill has been borrowed 47 times by 12 neighbors\u201d \u2014 for storytelling.",
      },
    ],
  },
  {
    name: "Maya Bonnet",
    role: "CMO",
    background:
      "Head of Brand & Communications at La Fourche. Digital & Innovation Manager at Mo\u00ebt Hennessy. Roles at Cartier and SAGUEZ & Partners. Luxury, food, and sustainability background.",
    skills: [
      {
        slug: "poppins-campaign-brief",
        description:
          "Takes a marketing objective \u2192 full campaign brief: concept, messaging, channel strategy, timeline, KPIs.",
      },
      {
        slug: "poppins-brand-guardian",
        description:
          "Reviews any content against brand voice, tone, and terminology guidelines. Returns flagged issues + fixes.",
      },
    ],
    cowork: [
      {
        title: "Monthly marketing report",
        description:
          "Drop performance CSVs + social screenshots + notes \u2192 formatted report with insights, trends, and recommendations.",
      },
      {
        title: "Campaign asset review",
        description:
          "Folder with draft assets \u2192 branded review flagging off-brand elements with fix suggestions.",
      },
    ],
    softwareForFew: [
      {
        title: "Marketing Mix Optimizer",
        description:
          "Takes ad spend, organic metrics, and conversions \u2192 recommends budget reallocation with projected impact.",
      },
      {
        title: "Content Performance Predictor",
        description:
          "Analyzes historical content performance \u2192 scores new drafts on likely engagement before publishing.",
      },
    ],
  },
  {
    name: "Violaine Tardieu",
    role: "Comms & PR Director",
    background:
      "Campaign Manager at The ONE Campaign (global advocacy). 10+ years in communications. UN General Assembly experience.",
    skills: [
      {
        slug: "poppins-press-release",
        description:
          "Encodes Poppins PR structure: headline (active, max 12 words), lede, founder quote, stats, boilerplate. Never \u201cexcited to announce.\u201d",
      },
      {
        slug: "poppins-media-pitch",
        description:
          "Takes news + target journalist type \u2192 tailored pitch. Different hooks for different beats.",
      },
    ],
    cowork: [
      {
        title: "Daily press monitoring",
        description:
          "Scheduled search for Poppins mentions and competitor coverage \u2192 morning briefing every weekday 8am.",
      },
      {
        title: "PR pipeline tracker",
        description:
          "Journalist correspondence folder \u2192 status overview: who\u2019s been pitched, who responded, what\u2019s pending.",
      },
    ],
    softwareForFew: [
      {
        title: "Media Coverage Analyzer",
        description:
          "Ingests press clippings \u2192 tracks coverage volume, sentiment, key message penetration, and Share of Voice.",
      },
      {
        title: "PR Calendar Intelligence",
        description:
          "Flags upcoming relevant editorial themes and deadlines for proactive pitching.",
      },
    ],
  },
  {
    name: "Marie Barbare",
    role: "Marketing Manager",
    background:
      "Previously at Veepee. Growth Marketing Bootcamp at Le Wagon. 6+ years in digital and brand marketing.",
    skills: [
      {
        slug: "poppins-social-content",
        description:
          "Platform-specific content generator: IG carousel, LinkedIn post, TikTok hooks. Brand voice enforced. Hashtag strategy.",
      },
      {
        slug: "poppins-growth-experiment",
        description:
          "Takes a hypothesis \u2192 structured experiment plan with metrics, timeline, and success criteria.",
      },
    ],
    cowork: [
      {
        title: "Weekly content calendar",
        description:
          "Drop metrics + notes \u2192 next week\u2019s content calendar with post concepts, copy drafts, and tracking spreadsheet.",
      },
      {
        title: "Social performance analysis",
        description:
          "Reads exported social metrics \u2192 identifies top/bottom performers, suggests content adjustments.",
      },
    ],
    softwareForFew: [
      {
        title: "Content Calendar Engine",
        description:
          "Monthly themes + key dates + performance history \u2192 full month\u2019s content calendar with draft copy and A/B test suggestions.",
      },
      {
        title: "Referral Loop Tracker",
        description:
          "Tracks how shared content converts to app downloads and first transactions.",
      },
    ],
  },
  {
    name: "Jotte Mallisse",
    role: "Freelancer Digital Marketing",
    background:
      "Go-to-market strategy for startups. Co-founded Zoomers. KU Leuven. Specializes in SEO, GEO, CRO, data-driven lifecycle marketing.",
    skills: [
      {
        slug: "poppins-seo-optimizer",
        description:
          "Takes target keywords + content type \u2192 SEO-optimized content briefs with structure, internal linking, and meta tags.",
      },
      {
        slug: "poppins-crm-flows",
        description:
          "Designs email/notification sequences for key user lifecycle moments: onboarding, activation, re-engagement, referral.",
      },
    ],
    cowork: [
      {
        title: "Weekly acquisition report",
        description:
          "Drop GA exports + ad platform data \u2192 synthesized report with channel performance, CAC trends, and recommendations.",
      },
      {
        title: "A/B test analysis",
        description:
          "Drop test data \u2192 statistical analysis with clear recommendation and next experiment suggestion.",
      },
    ],
    softwareForFew: [
      {
        title: "SEO Content Pipeline",
        description:
          "Automated keyword research \u2192 content brief \u2192 draft creation \u2192 optimization scoring. Full pipeline for one person.",
      },
      {
        title: "Lifecycle Marketing Automator",
        description:
          "Analyzes user behavior patterns and triggers personalized CRM sequences \u2014 usually requires a dedicated ops person.",
      },
    ],
  },
  {
    name: "Gaspard Houssel",
    role: "Partnership Specialist",
    background:
      "Commercial/B2B development. Trilingual: French, German, English. Strong negotiation and strategic analysis.",
    skills: [
      {
        slug: "poppins-partner-pitch",
        description:
          "Takes partner profile + Poppins offering \u2192 tailored pitch deck outline with partner-specific value props.",
      },
      {
        slug: "poppins-partnership-brief",
        description:
          "Generates partnership proposals: mutual benefits, integration model, success metrics, timeline.",
      },
    ],
    cowork: [
      {
        title: "Partner pipeline tracker",
        description:
          "Meeting notes and correspondence folder \u2192 weekly pipeline summary with status, next steps, stalled deals flagged.",
      },
      {
        title: "Multilingual partner comms",
        description:
          "Drop a French pitch \u2192 get German and English adaptations (not translations).",
      },
    ],
    softwareForFew: [
      {
        title: "Partner ROI Calculator",
        description:
          "Takes partnership parameters (foot traffic, item volume, commission) \u2192 projects ROI for both sides.",
      },
      {
        title: "Territory Mapper",
        description:
          "City data + existing partner locations \u2192 identifies white space opportunities and optimal next partners.",
      },
    ],
  },
  {
    name: "Sybille Ranchon",
    role: "Operations Manager",
    background:
      "VC Investor at Serena (\u20ac1B+ AUM). ESSEC Business School. Strategy and innovation consultancy. CFA Level 1.",
    skills: [
      {
        slug: "poppins-ops-doc",
        description:
          "Rough process descriptions \u2192 structured operational documentation with flow diagrams, SLAs, and escalation paths.",
      },
      {
        slug: "poppins-city-ops-report",
        description:
          "Generates city-level operational reports from raw data: transactions, support load, partner activity, item velocity.",
      },
    ],
    cowork: [
      {
        title: "Weekly ops digest",
        description:
          "City data exports folder \u2192 comparative operational report across all active cities.",
      },
      {
        title: "Support ticket analysis",
        description:
          "Categorizes ticket exports, flags trends, and suggests FAQ or product improvements.",
      },
    ],
    softwareForFew: [
      {
        title: "Ops Scaling Simulator",
        description:
          "Current metrics \u2192 models what happens at 2x, 5x, 10x. Where do processes break? Where do you hire?",
      },
      {
        title: "Insurance Claim Processor",
        description:
          "Semi-automated item damage claims: categorize, assess against policy, draft resolution, track outcomes.",
      },
    ],
  },
  {
    name: "Sofiya Neretina",
    role: "Customer Success",
    background:
      "Onboarding Manager at Greenly (B Corp). Sorbonne Universit\u00e9. Customer success and relationship management. Trilingual.",
    skills: [
      {
        slug: "poppins-support-responses",
        description:
          "Generates on-brand support responses for common scenarios: first contact, resolution, escalation, follow-up. Multilingual.",
      },
      {
        slug: "poppins-user-onboarding",
        description:
          "Designs onboarding touchpoints (in-app, email, push) optimized for activation.",
      },
    ],
    cowork: [
      {
        title: "Weekly support report",
        description:
          "Ticket exports folder \u2192 analysis of themes, response time trends, satisfaction scores, and improvement suggestions.",
      },
      {
        title: "FAQ updater",
        description:
          "Reads recent tickets \u2192 identifies new common questions \u2192 drafts FAQ additions.",
      },
    ],
    softwareForFew: [
      {
        title: "Smart Response Suggester",
        description:
          "Analyzes incoming messages \u2192 suggests best response template with personalization. Human reviews, drafting is instant.",
      },
      {
        title: "Churn Risk Detector",
        description:
          "Analyzes behavior patterns (declining activity, unused items) \u2192 flags at-risk users with re-engagement actions.",
      },
    ],
  },
];

export function getUseCaseByName(name: string): PoppinsUseCase | undefined {
  return POPPINS_USE_CASES.find((uc) => uc.name === name);
}
