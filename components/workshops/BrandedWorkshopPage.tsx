"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RAIL_WIDTH } from "./BrandedWorkshopFrame";
import { LoopTerrainMap } from "./sections/LoopTerrainMap";
import { WaypointTopography } from "./sections/WaypointTopography";
import { NavigateStory } from "./sections/NavigateStory";
import { EncodeSystemScene } from "./sections/EncodeSystemScene";
import { PoppinsLogo } from "./PoppinsLogo";
import type { BrandedJourneySettings } from "@/lib/workshops/types";

const HUD_PAD = 40;
const DESKTOP_CONTENT_MAX = 900;

type SectionMeta = {
  chapterId: string;
  chapterTitle: string;
  chapterAnchorId: string;
  sectionId: string;
  title: string;
  type?: string;
  bearing?: string;
};

type WorkshopLayout = {
  slidePadX: number;
  slidePadY: number;
  contentLeft: number;
  contentRight: number;
  contentMaxWidth: number;
  chapterTitleSize: number;
  contextLeft: number;
  contextTop: number;
  contextWidth: number;
};

type Props = { settings: BrandedJourneySettings; journeyName: string };

export function BrandedWorkshopPage({ settings, journeyName }: Props) {
  const { branding, agenda, team } = settings;
  const chapters = agenda.chapters;
  const { hudPad, viewportWidth } = useWorkshopViewportMetrics();
  const layout = useMemo(
    () => buildWorkshopLayout(viewportWidth, hudPad),
    [viewportWidth, hudPad],
  );
  const sectionMeta = useMemo<SectionMeta[]>(() => {
    let bearing = 0;

    return chapters.flatMap((chapter) => {
      const chapterAnchorId = chapter.sections[0]?.id ?? chapter.id;

      return chapter.sections.map((section) => {
        const isChapterTitle = section.type === "chapter-title";
        if (!isChapterTitle) bearing += 1;

        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterAnchorId,
          sectionId: section.id,
          title: section.title,
          type: section.type,
          bearing: isChapterTitle ? undefined : String(bearing).padStart(2, "0"),
        };
      });
    });
  }, [chapters]);
  const allSections = useMemo(
    () =>
      sectionMeta.map(({ sectionId, title, type }) => ({
        id: sectionId,
        title,
        type,
      })),
    [sectionMeta],
  );

  const [activeSection, setActiveSection] = useState(allSections[0]?.id ?? "");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [progress, setProgress] = useState(0);
  const [logoT, setLogoT] = useState(0);

  useEffect(() => {
    if (sectionMeta.length === 0) return;
    if (!sectionMeta.some((section) => section.sectionId === activeSection)) {
      setActiveSection(sectionMeta[0].sectionId);
    }
  }, [sectionMeta, activeSection]);

  useEffect(() => {
    function onScroll() {
      const st = document.documentElement.scrollTop || document.body.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(h > 0 ? (st / h) * 100 : 0);

      const heroEl = sectionRefs.current.get("hero");
      if (heroEl) {
        const heroH = heroEl.offsetHeight;
        const t = Math.min(1, Math.max(0, st / (heroH * 0.75)));
        setLogoT(t);
      }

      let cur = allSections[0]?.id ?? "";
      for (const s of allSections) {
        const el = sectionRefs.current.get(s.id);
        if (el && el.offsetTop - 250 <= st) cur = s.id;
      }
      setActiveSection(cur);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [allSections]);

  const scrollTo = useCallback((id: string) => {
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const reg = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el); else sectionRefs.current.delete(id);
  }, []);

  const vars = useMemo(() => {
    const v: Record<string, string> = {};
    if (branding.accentColor) v["--ws-accent"] = branding.accentColor;
    if (branding.secondaryColor) v["--ws-secondary"] = branding.secondaryColor;
    if (branding.backgroundBase) v["--ws-bg"] = branding.backgroundBase;
    if (branding.darkColor) v["--ws-dark"] = branding.darkColor;
    if (branding.fontFamily) v["--ws-font"] = branding.fontFamily;
    if (branding.monoFontFamily) v["--ws-mono"] = branding.monoFontFamily;
    return v;
  }, [branding]);

  const activeSectionMeta = useMemo(
    () =>
      sectionMeta.find((section) => section.sectionId === activeSection) ??
      sectionMeta[0],
    [sectionMeta, activeSection],
  );
  const pageStyle = useMemo(
    () =>
      ({
        ...(vars as React.CSSProperties),
        "--ws-slide-pad-x": `${layout.slidePadX}px`,
        "--ws-slide-pad-y": `${layout.slidePadY}px`,
        "--ws-content-left": `${layout.contentLeft}px`,
        "--ws-content-right": `${layout.contentRight}px`,
        "--ws-content-max": `${layout.contentMaxWidth}px`,
        "--ws-chapter-title-size": `${layout.chapterTitleSize}px`,
        "--ws-context-left": `${layout.contextLeft}px`,
        "--ws-context-top": `${layout.contextTop}px`,
        "--ws-context-width": `${layout.contextWidth}px`,
        background: "var(--ws-bg,#FCF3EC)",
        color: "var(--ws-dark,#241D1B)",
        minHeight: "100vh",
        overflowX: "clip",
      }) as React.CSSProperties,
    [vars, layout],
  );

  return (
    <div style={pageStyle}>
      {/* Accent handwritten font (Caveat -- closest to Verveine used on wearepoppins.com) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, background: "var(--ws-accent,var(--gold))", zIndex: 200, transition: "width .15s ease", width: `${progress}%` }} />

      {/* Logo -- centered in hero, docks to left rail on scroll */}
      <WorkshopLogoMotion t={logoT} hudPad={hudPad} viewportWidth={viewportWidth} />

      <WorkshopContextDock
        chapterLabel={activeSectionMeta?.chapterTitle ?? journeyName}
        chapterSectionId={activeSectionMeta?.chapterAnchorId}
        sectionLabel={activeSectionMeta?.title ?? journeyName}
        sectionId={activeSectionMeta?.sectionId}
        sectionBearing={activeSectionMeta?.bearing}
        onScrollTo={scrollTo}
        accentColor={branding.accentColor}
      />

      {/* Slides */}
      <Slide id="hero" reg={reg} style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: "clamp(36px,4.5vw,58px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
          AI is not a tool<br />to command. It&apos;s an<br /><em style={{ fontFamily: "'Caveat', cursive", fontStyle: "normal", fontWeight: 500, color: "var(--ws-accent,#FE6744)", fontSize: "1.15em" }}>intelligence to navigate.</em>
        </h1>
        <p style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: "17px", color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)", lineHeight: 1.7, maxWidth: 540, margin: "20px auto 40px" }}>
          A hands-on workshop for the {branding.clientName} team. From first conversation to building tools that don&apos;t exist yet.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {[{ label: "Navigate", bg: "var(--ws-secondary,#C4DD05)" }, { label: "Encode", bg: "#FEB3D2" }, { label: "Accelerate", bg: "var(--ws-accent,#FE6744)", color: "white" }].map((c) => (
            <span key={c.label} style={{ padding: "10px 24px", borderRadius: 40, fontSize: "14px", fontWeight: 600, fontFamily: "var(--ws-font,var(--font-sans))", background: c.bg, color: c.color ?? "var(--ws-dark,#241D1B)" }}>{c.label}</span>
          ))}
        </div>
      </Slide>

      {/* Loop */}
      <Slide id="loop" reg={reg} tint="var(--ws-bg,#FCF3EC)" tintTo="#f7f9e6">
        <div style={{ textAlign: "center" }}>
          <Tag>The framework</Tag>
          <h2 style={h2Style}>A map, <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 500, fontSize: "1.1em" }}>not a path.</span></h2>
          <Lead style={{ textAlign: "center", margin: "8px auto 0" }}>Three ways of working with AI that feed each other. You never stop navigating — you just cover more territory.</Lead>
          <LoopTerrainMap accentColor={branding.accentColor} darkColor={branding.darkColor} />
        </div>
      </Slide>

      {/* Navigate chapter */}
      <ChapterSlide id="nav-chapter" reg={reg} title="Navigate" subtitle="How to steer a possibility space" tint="#f7f9e6" tintFrom="var(--ws-bg,#FCF3EC)" accentColor={branding.accentColor} darkColor={branding.darkColor} mapAnchorX={52} showBadge={false} />

      <div id="nav-story" ref={(el) => reg("nav-story", el)} style={{ background: "#f7f9e6", position: "relative", overflow: "visible" }}>
        <NavigateStory clientName={branding.clientName} accentColor={branding.accentColor} darkColor={branding.darkColor} />
      </div>

      {/* Encode chapter */}
      <ChapterSlide id="enc-chapter" reg={reg} title="Encode" subtitle="How to scaffold knowledge" tint="#fcf0f5" tintFrom="#f7f9e6" accentColor={branding.accentColor} darkColor={branding.darkColor} mapAnchorX={46} />


      <Slide id="enc-context" reg={reg} tint="#fcf0f5" overlay={<SectionMapBackdrop accentColor={branding.accentColor} darkColor={branding.darkColor} anchorX={46} />}>
        <Tag bg="rgba(254,179,210,0.2)">The foundation</Tag>
        <h2 style={h2Style}>Context is <span style={caveatSpan}>Everything</span></h2>
        <Lead>For AI, these aren&apos;t different mediums — they&apos;re all coordinates it can navigate.</Lead>
        <ContextIcons />
        <p style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: 17, textAlign: "center", marginTop: 40, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)", lineHeight: 1.7 }}>
          Without context → median output.<br />With context → <strong>your</strong> output.
        </p>
        <RoomQuestion title="Context Audit" tag="Reflection">
          What context already exists for {branding.clientName}? Where is it scattered? (Slack, Notion, Figma, email, documents?) What&apos;s the one piece you&apos;d dump first?
        </RoomQuestion>
      </Slide>

      <div id="enc-system" ref={(el) => reg("enc-system", el)} style={{ background: "#fcf0f5", position: "relative", overflow: "visible" }}>
        <EncodeSystemScene clientName={branding.clientName} accentColor={branding.accentColor} darkColor={branding.darkColor} />
      </div>

      <Slide id="enc-projects" reg={reg} tint="#fcf0f5">
        <Tag bg="rgba(254,179,210,0.2)">Context container</Tag>
        <h2 style={h2Style}><span style={caveatSpan}>Projects</span></h2>
        <Lead style={{ textAlign: "center", marginBottom: 32 }}>Persistent instructions + uploaded knowledge. One project = one topic. Every conversation starts informed.</Lead>
        <CardGrid cols={2}>
          <PCard title="What it is" body="A container for context that stays active. Upload docs, paste your brand guide, include competitor research. AI starts every conversation in the right context." />
          <PCard title="When to use it" body="When you need consistent context across many conversations. Building something over time. Collaborating with others on the same topic." />
        </CardGrid>
        <div style={{ background: "var(--ws-dark,#241D1B)", color: "var(--ws-bg,#FCF3EC)", padding: "24px 28px", marginTop: 32, fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 13, lineHeight: 1.8 }}>
          Learn more: <a href="https://support.claude.com/en/articles/9519177" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ws-accent,#FE6744)", textDecoration: "underline" }}>Claude Projects — manage context and collaborate</a>
        </div>
        <RoomQuestion title="Project Mapping" tag="Pair discussion">
          What&apos;s one workflow where you&apos;d benefit from a persistent Project? What would you put in it? Who else would use it?
        </RoomQuestion>
      </Slide>

      <Slide id="enc-skills" reg={reg} tint="#fcf0f5">
        <Tag bg="rgba(254,179,210,0.2)">Reusable patterns</Tag>
        <h2 style={h2Style}><span style={caveatSpan}>Skills</span></h2>
        <Lead>Different from Projects. Projects = context. Skills = process.</Lead>
        <CardGrid cols={3} style={{ marginTop: 32 }}>
          <PCard title="What it is" body="A reusable workflow. Format: SKILL.md. Think of it as a template for a repeated task. Build once, use everywhere." />
          <PCard title="Open standard" body="Not locked to Claude. agentskills.io is an open format. Your skill works in other tools too." />
          <PCard title="The secret weapon" body='Embed a "never say" list. Define the tone. Set constraints. Your process, automated.' />
        </CardGrid>
        <div style={{ background: "rgba(254,103,68,0.05)", border: "1px solid rgba(254,103,68,0.15)", padding: 24, marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ws-accent,#FE6744)", marginBottom: 6 }}>Never Say List</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>
            One powerful skill technique: define what NOT to say. &quot;Never: &apos;leverage,&apos; &apos;synergy,&apos; &apos;touch base.&apos; Always: active voice, real data, specific stakes.&quot; Your voice, enforced.
          </p>
        </div>
        {team.length > 0 && (
          <>
            <h4 style={{ marginTop: 40, marginBottom: 20, fontSize: 14, fontWeight: 600 }}>Team Skills Ideas</h4>
            <TeamGrid members={team} branding={branding} cols={3} />
          </>
        )}
        <Exercise title="Skill Design Workshop" tag="Small group" tagBg="rgba(254,179,210,0.2)">
          Pick one role above. Design a skill for them in 3 lines: input → logic → output. What would make that skill valuable enough to use every week?
        </Exercise>
      </Slide>

      <Slide id="enc-memory" reg={reg} tint="#fcf0f5" tintTo="#fef0eb">
        <Tag bg="rgba(254,179,210,0.2)">Over time</Tag>
        <h2 style={h2Style}><span style={caveatSpan}>Memory</span></h2>
        <Lead style={{ textAlign: "center", marginBottom: 40 }}>Less effort than Projects or Skills. It just happens. And it compounds.</Lead>
        <CardGrid cols={3}>
          <PCard title="Conversations build context" body="Claude picks up details from what you've shared. Your constraints. Your taste. The jargon you use. It remembers." />
          <PCard title="Less effort over time" body="Week 1: explain everything. Week 3: mention a detail once, it sticks. Month 6: it anticipates constraints." />
          <PCard title="Compounding returns" body="More history = better outputs = more willing to use it = more history. The loop accelerates." />
        </CardGrid>
        <Exercise title="Memory Audit" tag="Pair share" tagBg="rgba(254,179,210,0.2)">
          Do you have a conversation thread where Claude &quot;remembers&quot; you? What did it pick up on? How did that change the quality of output?
        </Exercise>
      </Slide>

      {/* Accelerate chapter */}
      <ChapterSlide id="acc-chapter" reg={reg} title="Accelerate" subtitle="How to force-multiply your team" tint="#fef0eb" tintFrom="#fcf0f5" accentColor={branding.accentColor} darkColor={branding.darkColor} mapAnchorX={56} />

      <Slide id="acc-cowork" reg={reg} tint="#fef0eb" overlay={<SectionMapBackdrop accentColor={branding.accentColor} darkColor={branding.darkColor} anchorX={56} />}>
        <Tag bg="rgba(254,103,68,0.1)">Still chat, more autonomous</Tag>
        <h2 style={h2Style}><span style={caveatSpan}>Cowork</span></h2>
        <Lead style={{ textAlign: "center", marginBottom: 32 }}>Files in. Work out. Scheduled tasks. Connectors that travel.</Lead>
        <CardGrid cols={3}>
          {[{ icon: "\uD83D\uDCC1", title: "Files In / Work Out", body: "Upload a spreadsheet. Get a report. Upload a sketch. Get a design system. Files move. Work gets done. No copy-paste." },
            { icon: "\u23F0", title: "Scheduled Tasks", body: '"Every Monday, audit last week\'s metrics." "Daily, monitor competitor pricing." Work that runs without you asking.' },
            { icon: "\uD83D\uDD17", title: "Connected Tools", body: "Slack, Google Sheets, Linear, Notion. Claude reads them. Claude updates them. Your tools talk to each other." },
          ].map((c) => (
            <div key={c.title} style={cardBase}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{c.title}</h4>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>{c.body}</p>
            </div>
          ))}
        </CardGrid>
        <Exercise title="Monday Morning Report" tag="Brainstorm" tagBg="rgba(254,103,68,0.1)">
          What&apos;s the one report you create every Monday? Weekend social metrics? Competitor moves? Customer signals? Design that automated.
        </Exercise>
      </Slide>

      <Slide id="acc-build" reg={reg} tint="#fef0eb">
        <Tag bg="rgba(254,103,68,0.1)">The flywheel</Tag>
        <h2 style={h2Style}>Software for <span style={caveatSpan}>Few</span></h2>
        <Lead style={{ textAlign: "center", marginBottom: 40 }}>Build tools that only you need. The ones that don&apos;t exist yet.</Lead>
        <CardGrid cols={2}>
          <PCard title="Claude Code" body="Give Claude files. Describe what you want. It builds. You navigate the solution space. For one-off tools that solve your specific problem." />
          <PCard title="Cursor + AI" body="Your IDE + Claude. Code faster. Refactor entire files. The AI pairs with your instincts. You stay in flow." />
        </CardGrid>
        <div style={{ background: "rgba(254,103,68,0.05)", border: "1px solid rgba(254,103,68,0.15)", padding: 24, marginTop: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ws-accent,#FE6744)", marginBottom: 6 }}>The Flywheel</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>
            <strong>Navigate</strong> the problem space → <strong>encode</strong> what you&apos;ve learned → <strong>build</strong> a tool → <strong>discover</strong> what you&apos;re missing → <strong>encode</strong> again → <strong>build</strong> again. Each lap, your tool gets tighter.
          </p>
        </div>
        <Exercise title="Tool Ideation" tag="Brainstorm" tagBg="rgba(254,103,68,0.1)">
          What repetitive task is trapped in a PDF or email right now? Something that would be 2-3x faster as a tiny web app? That&apos;s your target.
        </Exercise>
      </Slide>

      <Slide id="acc-team" reg={reg} tint="#fef0eb" tintTo="var(--ws-bg,#FCF3EC)">
        <Tag bg="rgba(254,103,68,0.1)">Mapped to capabilities</Tag>
        <h2 style={h2Style}>Your Team&apos;s <span style={caveatSpan}>Profiles</span></h2>
        <Lead>We mapped your team&apos;s roles to Claude capabilities. Here&apos;s what&apos;s possible for each of you.</Lead>
        {team.length > 0 && <TeamGrid members={team} branding={branding} cols={2} style={{ marginTop: 32 }} />}
        <Exercise title="Capability Matching" tag="Reflection + pair share" tagBg="rgba(254,103,68,0.1)">
          Find your role above. Does that skill match your workflow? What would you add? What would you remove?
        </Exercise>
      </Slide>

      {/* Synthesis */}
      <Slide id="synthesis" reg={reg} tint="var(--ws-bg,#FCF3EC)" tintFrom="#fef0eb">
        <Tag>How it works together</Tag>
        <h2 style={h2Style}>The <span style={caveatSpan}>Flow</span></h2>
        <FlowRow />
        <div style={{ ...cardBase, marginTop: 48, background: "color-mix(in srgb, var(--ws-dark,#241D1B) 2%, transparent)", borderColor: "color-mix(in srgb, var(--ws-dark,#241D1B) 8%, transparent)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Meta-Example: This Page</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>
            This one-pager was <strong>navigated</strong> (what structure teaches best?), <strong>encoded</strong> (how do we scaffold the content?), and <strong>built</strong> (HTML + CSS + JS, all in one file). You&apos;re experiencing the proof.
          </p>
        </div>
        <Exercise title="Your Flow" tag="Individual reflection" tagBg="color-mix(in srgb, var(--ws-dark,#241D1B) 5%, transparent)">
          Take one {branding.clientName} project you&apos;re working on. Map it to this flow: brainstorm → validate → execute → iterate. Where&apos;s the bottleneck?
        </Exercise>
      </Slide>

      {/* Closing */}
      <Slide id="closing" reg={reg} style={{ background: "var(--ws-dark,#241D1B)", color: "var(--ws-bg,#FCF3EC)" }}>
        <h2 style={{ ...h2Style, marginBottom: 40 }}>Three <span style={caveatSpan}>Questions</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: responsiveGridTemplate(3), gap: 14 }}>
          {[
            { n: "1", q: <>What were you <em style={{ fontWeight: 300, fontStyle: "italic", color: "var(--ws-accent,#FE6744)" }}>not</em> pursuing because you thought you couldn&apos;t?</> },
            { n: "2", q: <>What becomes a <em style={{ fontWeight: 300, fontStyle: "italic", color: "var(--ws-accent,#FE6744)" }}>Skill</em> you build this week?</> },
            { n: "3", q: <>What runs <em style={{ fontWeight: 300, fontStyle: "italic", color: "var(--ws-accent,#FE6744)" }}>every week</em> without you asking?</> },
          ].map((item) => (
            <div key={item.n} style={{ border: "1px solid color-mix(in srgb, var(--ws-bg,#FCF3EC) 8%, transparent)", padding: 24 }}>
              <div style={{ fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 32, fontWeight: 500, opacity: 0.1, marginBottom: 10 }}>{item.n}</div>
              <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, fontFamily: "var(--ws-font,var(--font-sans))" }}>{item.q}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 60, fontSize: 14, opacity: 0.5 }}>Take 10 minutes. Write down one answer to each. Share one in Slack.</p>
      </Slide>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PRIMITIVES
   ══════════════════════════════════════════════════════════════ */

const h2Style: React.CSSProperties = { fontFamily: "var(--ws-font,var(--font-sans))", fontSize: "clamp(30px,3.5vw,46px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 0 };

const cardBase: React.CSSProperties = { background: "rgba(255,255,255,0.7)", border: "1px solid color-mix(in srgb, var(--ws-dark,#241D1B) 8%, transparent)", padding: 24, transition: "transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease" };

const MAP_FADE_MASK = "linear-gradient(to bottom, transparent 0%, black 14%, black 82%, transparent 100%)";

function buildTintBackground(tint?: string, tintFrom?: string, tintTo?: string): string | undefined {
  if (!tint) return undefined;
  if (tintFrom && tintTo) return `linear-gradient(to bottom, ${tintFrom} 0%, ${tint} 22%, ${tint} 78%, ${tintTo} 100%)`;
  if (tintFrom) return `linear-gradient(to bottom, ${tintFrom} 0%, ${tint} 28%)`;
  if (tintTo) return `linear-gradient(to bottom, ${tint} 72%, ${tintTo} 100%)`;
  return tint;
}

function useWorkshopViewportMetrics() {
  const [metrics, setMetrics] = useState({
    hudPad: HUD_PAD,
    viewportWidth: 1440,
  });

  useEffect(() => {
    function syncMetrics() {
      const nextHudPad = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--hud-padding"),
      );

      setMetrics({
        hudPad: Number.isFinite(nextHudPad) ? nextHudPad : HUD_PAD,
        viewportWidth: window.innerWidth,
      });
    }

    syncMetrics();
    window.addEventListener("resize", syncMetrics);
    return () => window.removeEventListener("resize", syncMetrics);
  }, []);

  return metrics;
}

function buildWorkshopLayout(viewportWidth: number, hudPad: number): WorkshopLayout {
  const compact = viewportWidth < 1100;
  const medium = viewportWidth < 1280;

  const slidePadX = compact ? 20 : medium ? 28 : 48;
  const slidePadY = compact ? 60 : 80;
  const leftDockWidth = compact ? 120 : medium ? 144 : 176;
  const rightDockWidth = compact ? 28 : medium ? 40 : 56;
  const contentLeft = hudPad + RAIL_WIDTH + leftDockWidth;
  const contentRight = hudPad + RAIL_WIDTH + rightDockWidth;

  return {
    slidePadX,
    slidePadY,
    contentLeft,
    contentRight,
    contentMaxWidth: Math.min(
      DESKTOP_CONTENT_MAX,
      Math.max(560, viewportWidth - contentLeft - contentRight),
    ),
    chapterTitleSize: compact ? 56 : medium ? 68 : 84,
    contextLeft: hudPad + 32,
    contextTop: hudPad + 34,
    contextWidth: compact ? 144 : medium ? 164 : 180,
  };
}

function responsiveGridTemplate(cols: number) {
  const minWidth = cols >= 4 ? 176 : cols === 3 ? 220 : 260;
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}

function Slide({ id, reg, children, style, tint, tintFrom, tintTo, overlay }: { id: string; reg: (id: string, el: HTMLElement | null) => void; children: React.ReactNode; style?: React.CSSProperties; tint?: string; tintFrom?: string; tintTo?: string; overlay?: React.ReactNode }) {
  return (
    <div id={id} ref={(el) => reg(id, el)} style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "var(--ws-slide-pad-y) var(--ws-slide-pad-x)", position: "relative", scrollSnapAlign: "start", overflow: "hidden", background: buildTintBackground(tint, tintFrom, tintTo), ...style }}>
      {overlay && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay}</div>}
      <div style={{ maxWidth: "var(--ws-content-max)", width: "100%", marginLeft: "calc(var(--ws-content-left) - var(--ws-slide-pad-x))", marginRight: "calc(var(--ws-content-right) - var(--ws-slide-pad-x))", position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function ChapterSlide({ id, reg, title, subtitle, tint, tintFrom, accentColor, darkColor, mapAnchorX = 50, mascotSrc, showBadge = true }: { id: string; reg: (id: string, el: HTMLElement | null) => void; title: string; subtitle: string; tint?: string; tintFrom?: string; accentColor?: string; darkColor?: string; mapAnchorX?: number; mascotSrc?: string; showBadge?: boolean }) {
  return (
    <Slide id={id} reg={reg} tint={tint} tintFrom={tintFrom} overlay={<ChapterMapBackdrop accentColor={accentColor} darkColor={darkColor} anchorX={mapAnchorX} />}>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        {mascotSrc ? (
          <img
            src={mascotSrc}
            alt=""
            style={{
              width: 120,
              height: 120,
              objectFit: "contain",
              margin: "0 auto 28px",
              display: "block",
              opacity: 0.9,
            }}
          />
        ) : showBadge ? (
          <ChapterMapBadge accentColor={accentColor} darkColor={darkColor} />
        ) : null}
        <h1 style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: "var(--ws-chapter-title-size)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: 22, fontWeight: 500, opacity: 0.55, marginTop: 20, letterSpacing: "0.01em" }}>{subtitle}</p>
      </div>
    </Slide>
  );
}

function ChapterMapBackdrop({ accentColor, darkColor, anchorX = 50 }: { accentColor?: string; darkColor?: string; anchorX?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: "6% 10% 0",
        opacity: 0.82,
        maskImage: MAP_FADE_MASK,
        WebkitMaskImage: MAP_FADE_MASK,
      }}
    >
      <WaypointTopography
        accentColor={accentColor}
        darkColor={darkColor}
        nodes={[
          { x: anchorX, y: 28, scale: 1.3 },
          { x: anchorX + 8, y: 68, scale: 0.62 },
        ]}
        routes={[
          {
            points: [
              [anchorX, 18],
              [anchorX + 2, 34],
              [anchorX - 2, 52],
              [anchorX + 8, 68],
              [anchorX + 3, 100],
            ],
            dashed: true,
            opacity: 0.52,
            width: 0.74,
          },
        ]}
      />
    </div>
  );
}

function ChapterMapBadge({ accentColor, darkColor }: { accentColor?: string; darkColor?: string }) {
  return (
    <div
      style={{
        width: 96,
        height: 96,
        margin: "0 auto 22px",
        opacity: 0.86,
      }}
    >
      <WaypointTopography
        accentColor={accentColor}
        darkColor={darkColor}
        nodes={[{ x: 50, y: 54, scale: 0.9 }]}
        routes={[
          {
            points: [
              [26, 72],
              [39, 63],
              [50, 54],
              [63, 45],
              [76, 34],
            ],
            dashed: true,
            opacity: 0.46,
            width: 0.72,
          },
        ]}
      />
    </div>
  );
}

function SectionMapBackdrop({ accentColor, darkColor, anchorX = 50 }: { accentColor?: string; darkColor?: string; anchorX?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 10%",
        opacity: 0.54,
        maskImage: MAP_FADE_MASK,
        WebkitMaskImage: MAP_FADE_MASK,
      }}
    >
      <WaypointTopography
        accentColor={accentColor}
        darkColor={darkColor}
        nodes={[
          { x: anchorX, y: 6, scale: 0.88 },
          { x: anchorX + 9, y: 72, scale: 0.54 },
        ]}
        routes={[
          {
            points: [
              [anchorX, 0],
              [anchorX + 1, 18],
              [anchorX - 4, 44],
              [anchorX + 9, 72],
              [anchorX + 3, 100],
            ],
            dashed: true,
            opacity: 0.44,
            width: 0.66,
          },
        ]}
      />
    </div>
  );
}

function Tag({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", padding: "4px 12px", marginBottom: 14, background: bg ?? "color-mix(in srgb, var(--ws-dark,#241D1B) 5%, transparent)", textTransform: "uppercase" }}>{children}</div>;
}

const caveatSpan: React.CSSProperties = { fontFamily: "'Caveat', cursive", fontWeight: 500, fontSize: "1.1em", fontStyle: "normal" };

function Lead({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontFamily: "var(--ws-font,var(--font-sans))", fontSize: 17, fontWeight: 400, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)", lineHeight: 1.7, maxWidth: 540, margin: "8px 0 0", ...style }}>{children}</p>;
}

function CardGrid({ children, cols, style }: { children: React.ReactNode; cols: number; style?: React.CSSProperties }) {
  return <div style={{ display: "grid", gridTemplateColumns: responsiveGridTemplate(cols), gap: 14, ...style }}>{children}</div>;
}

function PCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={cardBase}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title.replace(/>/g, "\u203A")}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>{body}</p>
    </div>
  );
}

function Exercise({ title, children, tag, tagBg }: { title: string; children: React.ReactNode; tag: string; tagBg: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.7)", border: "2px dashed color-mix(in srgb, var(--ws-dark,#241D1B) 12%, transparent)", padding: 32, marginTop: 40, position: "relative" }}>
      <div style={{ position: "absolute", top: -10, left: 24, background: "rgba(255,255,255,0.7)", padding: "0 8px", fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "var(--ws-accent,#FE6744)" }}>
        ✦ EXERCISE
      </div>
      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{title}</h4>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>{children}</p>
      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 40, marginTop: 14, background: tagBg, color: "var(--ws-dark,#241D1B)", fontFamily: "var(--ws-font,var(--font-sans))" }}>{tag}</span>
    </div>
  );
}

function RoomQuestion({ title, children, tag, accentColor = "var(--ws-accent,#FE6744)" }: { title: string; children: React.ReactNode; tag: string; accentColor?: string }) {
  return (
    <div style={{ background: `color-mix(in srgb, ${accentColor} 6%, white)`, border: `2px solid color-mix(in srgb, ${accentColor} 22%, transparent)`, padding: 32, marginTop: 40, position: "relative" }}>
      <div style={{ position: "absolute", top: -10, left: 24, background: `color-mix(in srgb, ${accentColor} 6%, white)`, padding: "0 8px", fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: accentColor }}>
        ✦ QUESTION FOR THE ROOM
      </div>
      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{title}</h4>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>{children}</p>
      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 40, marginTop: 14, background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: "var(--ws-dark,#241D1B)", fontFamily: "var(--ws-font,var(--font-sans))" }}>{tag}</span>
    </div>
  );
}

function ConceptStack({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 28, overflow: "hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: "24px 28px", display: "flex", gap: 16, alignItems: "flex-start", background: "rgba(255,255,255,0.4)", borderBottom: i < items.length - 1 ? "1px solid color-mix(in srgb, var(--ws-dark,#241D1B) 8%, transparent)" : undefined }}>
          <div style={{ fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 10, opacity: 0.4, paddingTop: 2, flexShrink: 0, width: 20 }}>{i + 1}</div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{item.title}</h4>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)" }}>{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamGrid({ members, branding, cols, style }: { members: BrandedJourneySettings["team"]; branding: BrandedJourneySettings["branding"]; cols: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: responsiveGridTemplate(cols), gap: 14, ...style }}>
      {members.map((m) => (
        <div key={m.name} style={{ ...cardBase, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, color: "white", background: m.color ?? branding.accentColor ?? "var(--gold)" }}>{m.initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 50%, transparent)" }}>{m.role}</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 50%, transparent)", lineHeight: 1.6 }}>{m.description}</p>
          {m.skillIdea && (
            <div style={{ fontFamily: "var(--ws-mono,var(--font-mono))", fontSize: 11, paddingTop: 12, borderTop: "1px solid color-mix(in srgb, var(--ws-dark,#241D1B) 8%, transparent)", opacity: 0.8 }}>
              → Skill: {m.skillIdea}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WorkshopContextDock({
  chapterLabel,
  chapterSectionId,
  sectionLabel,
  sectionId,
  sectionBearing,
  onScrollTo,
  accentColor,
}: {
  chapterLabel: string;
  chapterSectionId?: string;
  sectionLabel: string;
  sectionId?: string;
  sectionBearing?: string;
  onScrollTo: (id: string) => void;
  accentColor?: string;
}) {
  if (!chapterLabel && !sectionLabel) return null;

  const chapterClickable = Boolean(chapterSectionId);
  const sectionClickable = Boolean(sectionId);
  const accent = accentColor ?? "var(--gold)";

  return (
    <nav
      style={{
        position: "fixed",
        top: "var(--ws-context-top)",
        left: "var(--ws-context-left)",
        width: "var(--ws-context-width)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (chapterSectionId) onScrollTo(chapterSectionId);
        }}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          textAlign: "left",
          cursor: chapterClickable ? "pointer" : "default",
          pointerEvents: chapterClickable ? "auto" : "none",
          fontFamily: "var(--ws-mono,var(--font-mono))",
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ws-dark,#241D1B)",
          opacity: 0.42,
        }}
      >
        {chapterLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          if (sectionId) onScrollTo(sectionId);
        }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          borderLeft: `2px solid ${accent}`,
          padding: "0 0 0 10px",
          margin: 0,
          textAlign: "left",
          cursor: sectionClickable ? "pointer" : "default",
          pointerEvents: sectionClickable ? "auto" : "none",
          color: "var(--ws-dark,#241D1B)",
        }}
      >
        {sectionBearing && (
          <span
            style={{
              fontFamily: "var(--ws-mono,var(--font-mono))",
              fontSize: "9px",
              lineHeight: 1.4,
              opacity: 0.32,
              flexShrink: 0,
              paddingTop: 1,
            }}
          >
            {sectionBearing}
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--ws-font,var(--font-sans))",
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {sectionLabel}
        </span>
      </button>
    </nav>
  );
}

function WorkshopLogoMotion({
  t,
  hudPad,
  viewportWidth,
}: {
  t: number;
  hudPad: number;
  viewportWidth: number;
}) {
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const heroTop = hudPad + 24;
  // The SVG includes sparkles above the owl/text, so the container has to sit
  // slightly above the HUD line for the visible logo to feel aligned.
  const dockedTop = hudPad - 6;
  const dockedLeft = hudPad + 32;

  const top = heroTop + (dockedTop - heroTop) * ease;
  const height = 36 + (20 - 36) * ease;
  const opacity = 0.85 + (0.6 - 0.85) * ease;

  const viewportCenter = viewportWidth / 2;
  const logoWidthEstimate = height * (499 / 128);
  const centeredLeft = viewportCenter - logoWidthEstimate / 2;
  const left = centeredLeft + (dockedLeft - centeredLeft) * ease;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 50,
        pointerEvents: "none",
        top,
        left,
        height,
        opacity,
        willChange: "top, left, height, opacity",
      }}
    >
      <PoppinsLogo
        color="var(--ws-dark, #241D1B)"
        style={{ height: "100%", width: "auto" }}
      />
    </div>
  );
}

function FlowRow() {
  const steps = [
    { icon: "\uD83D\uDCAD", title: "Brainstorm", body: "Explore idea space with AI." },
    { icon: "\u2713", title: "Validate", body: "Check assumptions against data." },
    { icon: "\u2699\uFE0F", title: "Execute", body: "Build the tool. Ship the thing." },
    { icon: "\uD83D\uDD04", title: "Iterate", body: "Refine constraints. Loop." },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", margin: "32px 0" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.title}>
          <div style={{ ...cardBase, padding: "20px 16px", textAlign: "center", width: 155 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</h4>
            <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--ws-dark,#241D1B) 55%, transparent)", lineHeight: 1.4 }}>{s.body}</p>
          </div>
          {i < steps.length - 1 && <span style={{ fontSize: 18, opacity: 0.15 }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function ContextIcons() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 40, margin: "48px 0", flexWrap: "wrap" }}>
      {[
        { label: "Images", svg: <svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" rx="4" /><circle cx="16" cy="16" r="2" fill="currentColor" /><path d="M 8 28 L 20 16 L 28 24 L 40 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg> },
        { label: "Documents", svg: <svg viewBox="0 0 48 48"><rect x="10" y="8" width="28" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" /><line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="1" /><line x1="14" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="1" /><line x1="14" y1="26" x2="30" y2="26" stroke="currentColor" strokeWidth="1" /><line x1="14" y1="32" x2="28" y2="32" stroke="currentColor" strokeWidth="1" /></svg> },
        { label: "Data", svg: <svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />{[14,18,22,26,30,34].map((y)=><line key={y} x1="12" y1={y} x2="36" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />)}{[12,18,24,30,36].map((x)=><line key={x} x1={x} y1="14" x2={x} y2="38" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />)}</svg> },
        { label: "Transcripts", svg: <svg viewBox="0 0 48 48"><circle cx="16" cy="18" r="2" fill="currentColor" /><path d="M 12 24 L 20 24" stroke="currentColor" strokeWidth="1" /><circle cx="32" cy="18" r="2" fill="currentColor" /><path d="M 28 24 L 36 24" stroke="currentColor" strokeWidth="1" /><path d="M 20 32 Q 24 28 28 32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg> },
        { label: "Video", caveat: "(Gemini only)", svg: <svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" /><rect x="10" y="12" width="28" height="6" fill="currentColor" opacity="0.3" /><circle cx="14" cy="22" r="3" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M 22 22 L 30 28" stroke="currentColor" strokeWidth="1" /><circle cx="30" cy="32" r="3" fill="none" stroke="currentColor" strokeWidth="1" /></svg> },
      ].map((c) => (
        <div key={c.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ width: 64, height: 64 }}>{c.svg}</div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</p>
          {c.caveat && <span style={{ fontSize: 11, color: "var(--ws-accent,#FE6744)" }}>{c.caveat}</span>}
        </div>
      ))}
    </div>
  );
}

