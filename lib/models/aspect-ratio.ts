/**
 * Shared aspect-ratio helpers for snapping an uploaded reference image to the
 * closest ratio a model actually supports.
 *
 * Providers only accept a fixed set of ratios (Gemini takes a `"W:H"` string,
 * GPT Image 2 maps to a fixed pixel size), so an arbitrary uploaded ratio can
 * never be matched exactly — we snap to the nearest supported option instead.
 *
 * Pure module (no `window`/DOM access) so it is safe to import from both server
 * adapters and client components.
 */

export const DEFAULT_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

/**
 * Given an image's pixel dimensions and a model's supported ratio labels,
 * return the closest supported `"W:H"` label, or `null` when nothing usable.
 *
 * Distance is measured in log space (`|ln(a) - ln(b)|`) so that inverse ratios
 * are treated symmetrically and extreme/portrait ratios snap accurately.
 * Non-numeric labels (e.g. `"auto"`) are skipped.
 */
export function detectClosestAspectRatio(
  width: number,
  height: number,
  supported: string[],
): string | null {
  if (width <= 0 || height <= 0 || supported.length === 0) return null;
  const target = Math.log(width / height);
  let closest: string | null = null;
  let minDiff = Infinity;
  for (const label of supported) {
    const [w, h] = label.split(":").map(Number);
    if (!w || !h) continue;
    const diff = Math.abs(target - Math.log(w / h));
    if (diff < minDiff) {
      minDiff = diff;
      closest = label;
    }
  }
  return closest;
}

/**
 * Snap an existing `"W:H"` ratio label to the closest one in `supported`.
 * Returns `null` when the label can't be parsed (e.g. `"auto"`) so callers can
 * decide their own fallback.
 */
export function snapLabelToSupported(
  currentLabel: string,
  supported: string[],
): string | null {
  const [w, h] = currentLabel.split(":").map(Number);
  if (!w || !h) return null;
  return detectClosestAspectRatio(w, h, supported);
}
