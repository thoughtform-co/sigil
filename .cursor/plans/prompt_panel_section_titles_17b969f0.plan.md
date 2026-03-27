---
name: Prompt panel section titles
overview: Remove the prompt panel border, replace the divider with section titles (PROMPT, REFERENCE, PARAMETERS) styled to match the ContextAnchor bearing labels, and remove the inline REF label from the reference thumbnail.
todos:
  - id: css-changes
    content: Remove border from .promptPanel and add .sectionTitle class in ForgeGenerationCard.module.css
    status: completed
  - id: jsx-restructure
    content: Add PROMPT/REFERENCE/PARAMETERS section titles, remove divider element and REF label in ForgeGenerationCard.tsx
    status: completed
isProject: false
---

# Prompt Panel Section Titles

## Summary

Restructure the prompt panel in `ForgeGenerationCard` to use labeled subsections instead of a bordered box with a divider. Section titles follow the same typographic pattern as the ContextAnchor bearing labels in the nav spine.

## File: [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css)

### 1. Remove border from `.promptPanel`

Delete `border: 1px solid var(--dawn-08);` (line 27).

### 2. Add `.sectionTitle` class

New class matching the ContextAnchor `BEARING_STYLE`:

```css
.sectionTitle {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dawn-30);
  display: block;
  margin-bottom: 4px;
  flex-shrink: 0;
}
```

### 3. Remove `.promptPanelDivider`

The 1px divider rule (lines 30-35) is no longer needed -- section titles replace it as visual separators. The CSS can stay (harmless), but the element will be removed from the JSX.

### 4. Remove `.refThumbLabel`

The "REF" label next to the thumbnail (lines 346-353) is replaced by the "REFERENCE" section title above. The CSS can stay, but the `<span>` will be removed from JSX.

## File: [ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx)

### 1. Add "PROMPT" section title above the prompt block

Before the `<button className={promptBlock}>` (line 289), add:

```tsx
<span className={styles.sectionTitle}>Prompt</span>
```

### 2. Remove the divider element

Delete the `<div className={styles.promptPanelDivider} />` (line 299).

### 3. Add "REFERENCE" section title above the reference thumbnail

Inside the `{refImageUrl && (...)}` block (line 302), add a section title before the `<button>`:

```tsx
{refImageUrl && (
  <>
    <span className={styles.sectionTitle}>Reference</span>
    <button ...>
      <img ... />
    </button>
  </>
)}
```

### 4. Remove the REF label from the thumbnail

Delete the `<span className={styles.refThumbLabel}>REF</span>` (line 310) from inside the reference button.

### 5. Add "PARAMETERS" section title above the metadata readouts

Before `<div className={styles.metaReadouts}>` (line 314), add:

```tsx
<span className={styles.sectionTitle}>Parameters</span>
```
