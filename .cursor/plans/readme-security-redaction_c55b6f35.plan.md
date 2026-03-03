---
name: readme-security-redaction
overview: Apply a public-doc security redaction pass and a claim-vs-code consistency pass so READMEs avoid secret/config disclosure and avoid overstating implemented functionality.
todos:
  - id: policy-update
    content: Update skill templates to enforce secure public README output and require claim-vs-code verification.
    status: completed
  - id: audit-claims-vs-code
    content: Run a repo-by-repo claim audit for all in-scope READMEs and classify claims as confirmed, unclear, or stale/incorrect.
    status: completed
  - id: correct-readme-claims
    content: Correct stale/overstated README claims to match what is actually implemented.
    status: pending
  - id: redact-public-readmes
    content: Redact `.env`, variable names, and key/token names while preserving high-level setup guidance.
    status: pending
  - id: validate-final
    content: Validate both security redaction and technical accuracy with final pattern checks and spot verification.
    status: completed
  - id: summarize-changes
    content: Provide a file-by-file summary of claim corrections and security redactions.
    status: pending
isProject: false
---

# README Security + Accuracy Plan

## Goal

Harden public README quality on two fronts:

- **Security hygiene:** no `.env` references, no variable names, no key/token/secret naming.
- **Factual accuracy:** no claims that exceed what is implemented in code.

You confirmed:

- **Strictness:** allow generic local config wording, but no variable names/key names.
- **Scope:** all public READMEs plus skill templates that generate README output.
- **Expansion:** include claim-vs-code consistency corrections in the same pass.

## Files in Scope

- Public READMEs:
  - [C:\Users\buyss\Manifold Delta\Artifacts\01_thoughtform\README.md](C:\Users\buyss\Manifold Delta\Artifacts\01_thoughtform\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\02_astrolabe.thoughtform\README.md](C:\Users\buyss\Manifold Delta\Artifacts\02_astrolabe.thoughtform\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\03_atlas.thoughtform\README.md](C:\Users\buyss\Manifold Delta\Artifacts\03_atlas.thoughtform\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\README.md](C:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vesper\README.md](C:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vesper\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\10_Babylon\README.md](C:\Users\buyss\Manifold Delta\Artifacts\10_Babylon\README.md)
  - [C:\Users\buyss\Manifold Delta\Artifacts\11_Heimdall\README.md](C:\Users\buyss\Manifold Delta\Artifacts\11_Heimdall\README.md)
- Skill templates:
  - [C:\Users\buysscursor\skills\thoughtform-readme\SKILL.md](C:\Users\buyss.cursor\skills\thoughtform-readme\SKILL.md)
  - [C:\Users\buysscursor\skills\thoughtform-readme\references\readme-anatomy.md](C:\Users\buyss.cursor\skills\thoughtform-readme\references\readme-anatomy.md)
  - [C:\Users\buysscursor\skills\thoughtform-readme\references\quality-rubric.md](C:\Users\buyss.cursor\skills\thoughtform-readme\references\quality-rubric.md)

## Rules to Enforce

1. No `.env` file references in public README output.
2. No environment variable names or key/token/secret names in public README output.
3. Setup guidance remains, but phrased generically (secure local configuration, provider setup docs, internal ops docs).
4. Claims must map to current implementation:
  - If implemented: keep.
  - If partial/conditional: soften wording.
  - If stale/incorrect: correct or remove.

## Implementation Steps

1. **Update skill policy first**
  - Add explicit public-doc security rule in `SKILL.md`.
  - Add explicit claim-vs-code gate in `quality-rubric.md`.
  - Update `readme-anatomy.md` Getting Started guidance to ban variable/key naming.
2. **Claim audit pass**
  - Review README claims against code/docs/config for each repo.
  - Tag each claim: confirmed, unclear, stale/incorrect.
3. **Correct README claims**
  - Patch stale/overstated lines with precise wording.
  - Keep confidence language accurate where implementation is conditional.
4. **Security redaction pass**
  - Remove `.env` snippets, variable tables, explicit key/token naming.
  - Keep setup instructions practical at a high level.
5. **Final validation**
  - Pattern sweep: `.env`, `_KEY`, `TOKEN`, `SECRET`, `DATABASE_URL`, provider-key naming.
  - Spot-check corrected claims against source code for Vesper/Babylon/Heimdall.
6. **Delivery**
  - Provide concise per-file summary: what was corrected for accuracy and what was redacted for security.
  - Commit/push only if explicitly requested.

## Expected Outcome

- Public READMEs are safer and still useful.
- README claims are aligned with what is actually shipped.
- Skill templates enforce this standard for future README generation.

