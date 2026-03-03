---
name: loop-readme-brief-rollout
overview: Rewrite Vesper, Babylon, and Heimdall READMEs into brief Loop-first narratives with no explicit Thoughtform philosophy language, and add a private chronology reference in the skill to keep historical context consistent across future updates.
todos:
  - id: rewrite-loop-readmes
    content: Rewrite Vesper, Babylon, and Heimdall READMEs into brief Loop-first narratives with no explicit Thoughtform philosophy language.
    status: completed
  - id: create-private-chronology
    content: Create loop-chronology-private.md inside thoughtform-readme references using Vesper/Babylon/Heimdall + briefing-assistant chronology.
    status: completed
  - id: align-skill-rules
    content: Update thoughtform-readme SKILL/rubric/constellation guidance so Loop public READMEs avoid explicit Thoughtform philosophy terms.
    status: completed
  - id: validate-terminology
    content: Run final checks to ensure prohibited philosophy terms are absent from public Loop READMEs and docs remain concise.
    status: completed
  - id: commit-and-push
    content: Commit and push README changes to each corresponding Loop repository main branch.
    status: completed
isProject: false
---

# Loop README Briefing Plan

## Goal

Update three Loop repos so their public READMEs are short, operational, and Loop-specific, while keeping deeper cross-project chronology in a private skill reference file.

## Scope Confirmed

- Rewrite public READMEs for:
  - [C:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vesper\README.md](C:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vesper\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\10_Babylon\README.md](C:\Users\buyss\Manifold Delta\Artifacts\10_Babylon\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\11_Heimdall\README.md](C:\Users\buyss\Manifold Delta\Artifacts\11_Heimdall\README.md)
- Use [C:\Users\buyss\Manifold Delta\Artifacts\06_briefing-assistant.loop](C:\Users\buyss\Manifold Delta\Artifacts\06_briefing-assistant.loop) as chronology/context only (no README rewrite in this round).
- Create a private chronology reference inside the skill for future README generation consistency.
- Commit and push each changed Loop repo to its `main` branch.

## Implementation Plan

1. **Establish Loop-only README pattern (brief mode)**
  - Keep each README concise and practical: what problem it solved, what workflow bottleneck it removes, what teams use it, and what shipped.
  - Remove explicit Thoughtform-branded philosophy language from public README copy.
  - Keep “software-for-few / software-for-one-team” framing as the core positioning.
2. **Rewrite each README with repo-specific narrative**
  - **Vesper:** frame as internal generation suite built from production bottlenecks (flow-state preservation, prompt enhancement, image-to-video continuity, PDF image extraction, cost transparency/control).
  - **Babylon:** frame as localization pipeline built for verification-heavy work (transcription/caption matching, human-in-the-loop translation review, spreadsheet-like review surface with versioning).
  - **Heimdall:** frame as workflow bridge between Monday and Figma, then expanded toward feedback summarization and briefing-assistant convergence via shared sheet primitives.
3. **Add private chronology source in the skill**
  - Create a new internal-only reference file under:
    - [C:\Users\buysscursor\skills\thoughtform-readme\references\loop-chronology-private.md](C:\Users\buyss.cursor\skills\thoughtform-readme\references\loop-chronology-private.md)
  - Capture chronology and lineage across:
    - Vesper → Babylon → Heimdall
    - Briefing-assistant as precursor/parallel stream and planned convergence point
  - Include: origin pressure, key workflow insights, reusable components extracted, unresolved bottlenecks, and practical constraints.
4. **Update skill guidance to consume the private chronology for Loop repos**
  - Update [C:\Users\buysscursor\skills\thoughtform-readme\SKILL.md](C:\Users\buyss.cursor\skills\thoughtform-readme\SKILL.md) so Loop-repo generation rules explicitly avoid public Thoughtform philosophy references.
  - Update [C:\Users\buysscursor\skills\thoughtform-readme\references\repo-constellation.md](C:\Users\buyss.cursor\skills\thoughtform-readme\references\repo-constellation.md) Loop entries to align with Loop-first wording and point internally to the private chronology reference.
  - If needed, adjust [C:\Users\buysscursor\skills\thoughtform-readme\references\quality-rubric.md](C:\Users\buyss.cursor\skills\thoughtform-readme\references\quality-rubric.md) with a Loop-check: “no explicit Thoughtform philosophy terms in public Loop README copy.”
5. **Validation and delivery**
  - Run a final term sweep on the three public READMEs for explicit banned phrasing (e.g., `Thoughtform`, `navigating intelligence`, `thought and form`, `Cardinal`).
  - Ensure README structure remains brief and skimmable.
  - Commit and push to each corresponding repo `main` branch with clear, per-repo commit messages.

## Expected Outcome

- Three clean public READMEs that represent Loop operational reality without Thoughtform-philosophy overlays.
- One private chronology reference that preserves deeper narrative and reuse lineage for future updates.
- Skill behavior aligned with this split: concise public docs, richer private memory.

