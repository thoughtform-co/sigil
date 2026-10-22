/**
 * The character creator of Expo City (2026-10-22): in the game, a student drops one to four pictures
 * of a character from their own world; Sigil draws the front view from them with the course's avatar
 * recipe (thomas-more-ai-studio, plugins/ai-storytelling/skills/avatar/references/avatar-recipe.md),
 * then the right, back and left views from the kept front, each with the same rules and one change,
 * the side the camera is on. The student keeps a view or draws it again; the four kept views become
 * their avatar, which the game reads from `GET /api/expo/me` and walks round the city.
 *
 * Every draw is an ordinary draw "through Claude" (source mcp, the person's project "Claude"), so it
 * counts against MCP_DAILY_IMAGES like any other and no key ever reaches the student. Each finished
 * view is cut out of its plain light ground here (a flood fill from the border, so the figure keeps
 * its own light colours) and saved as a transparent PNG beside the original.
 *
 * The kept avatar is a private document per student (`expo/avatar/<user>.json`, references bucket):
 * what the game is given (`avatar`), and the originals the views were cut from, which a 3D model is
 * made from once Meshy is configured. The shape the game reads is the contract all of Expo City
 * builds to (Arcs_Thomas More, the plan's "shared contract"):
 *
 *   avatar = null | { kind: "views", front, right, back, left }
 *               | { kind: "sheet", src, cols, rows, fps, dirs: 4 }
 *               | { kind: "glb", src, views? }
 */

import sharp from "sharp";
import { z } from "zod";

export const AVATAR_VIEWS = ["front", "right", "back", "left"] as const;
export type AvatarView = (typeof AVATAR_VIEWS)[number];
export const SIDE_VIEWS = ["right", "back", "left"] as const satisfies readonly AvatarView[];

/** At most this many pictures of the character go in; the recipe's draws take more, but four is the panel. */
export const MAX_AVATAR_IMAGES = 4;
/** What the student may add in words, for the front's prompt. */
export const NOTE_MAX = 300;

const Url = z.string().url().max(2000);
const ViewsSchema = z.strictObject({ front: Url, right: Url, back: Url, left: Url });

export const AvatarSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("views"), ...ViewsSchema.shape }),
  z.strictObject({
    kind: z.literal("sheet"),
    src: Url,
    cols: z.number().int().min(1).max(64),
    rows: z.number().int().min(1).max(64),
    fps: z.number().min(1).max(60),
    dirs: z.literal(4),
  }),
  z.strictObject({ kind: z.literal("glb"), src: Url, views: ViewsSchema.optional() }),
]);
export type Avatar = z.infer<typeof AvatarSchema>;
export type AvatarViews = z.infer<typeof ViewsSchema>;

/** The private document: what the game gets, and what it was made from. */
export interface StoredAvatar {
  avatar: Avatar;
  /** The four views as drawn, on their light ground: what a 3D model is made from. */
  sources?: AvatarViews;
  /** The draws behind the views, by view. */
  jobs?: Partial<Record<AvatarView, string>>;
  keptAt: string;
}

/** What a draw of the creator carries in its parameters, so its status can be read back. */
export interface AvatarDrawTag {
  view: AvatarView | "glb";
  /** The front draw a side view was drawn from. */
  front?: string;
  /** The transparent PNG, once cut. */
  cutout?: string;
}

export function avatarTagOf(parameters: unknown): AvatarDrawTag | null {
  const tag = (parameters as { expoAvatar?: unknown } | null)?.expoAvatar as AvatarDrawTag | undefined;
  if (!tag || typeof tag !== "object") return null;
  return tag.view === "glb" || (AVATAR_VIEWS as readonly string[]).includes(tag.view) ? tag : null;
}

/** The recipe's rules, the same for every view (avatar-recipe.md, "The four views" and "What the character may wear"). */
const RULES = [
  "The whole character from head to feet with a little room round it, centred, the figure about 85% of the frame's height.",
  "Standing straight in an A-pose: arms straight and angled about 30 degrees away from the body, hands open with the fingers together, feet a little apart, looking straight ahead. Not a T-pose, not arms at the sides, not a walking stance.",
  "A plain flat light grey background, one even colour: no gradient, no floor, no shadow on the ground, no scenery.",
  "Even soft light from the front, no hard shadows.",
  "Fitted clothes, short jackets, trousers, short skirts, boots, short or tied-back hair, a cap close to the head. No cape, no long coat, no robe or gown, no hood, no wide skirt, no long loose hair over the shoulders, no wings, no tail, nothing held in the hands, nothing floating round the body.",
  "No text, no letters, no logo, no frame, no border, no watermark.",
  "Never a real person: if a reference shows a real person, draw an invented character who shares only their clothes, colours and materials, with a face of their own.",
  "A clean game character, square image.",
].join(" ");

const VIEW_LINE: Record<AvatarView, string> = {
  front: "Front view: the character faces the camera.",
  right: "Right view: a true side profile at 90 degrees, not a three-quarter view. The camera is on the character's own right side: the whole body turned so they face the left edge of the image, one eye and one ear visible, the nose pointing left.",
  back: "Back view: straight from behind, the body square to the camera: we see their back and the back of the head and hair, nothing of the face.",
  left: "Left view: a true side profile at 90 degrees, not a three-quarter view. The camera is on the character's own left side: the whole body turned so they face the right edge of the image, one eye and one ear visible, the nose pointing right.",
};

/** The prompt for one view. The front is drawn from the student's pictures; the others from the kept front. */
export function avatarPrompt(view: AvatarView, note?: string | null): string {
  const said = note?.trim() ? ` The student says of them: "${note.trim().slice(0, NOTE_MAX).replace(/"/g, "'")}".` : "";
  const lead =
    view === "front"
      ? `A full-body game character drawn from the reference images: one character from the student's own invented world, as those pictures show them (their clothes, colours, materials and build).${said}`
      : "The same character as in the reference image, exactly: the same face, hair, clothes, colours and proportions, the same height in the frame, the same A-pose, the same plain light grey background and the same light. One change only, the side the camera is on.";
  return `${lead} ${VIEW_LINE[view]} ${RULES}`;
}

/**
 * Cut a view out of its plain light ground: the ground's colour is read from the border, a flood fill
 * from every border pixel takes what is close to it, and the figure's edge is feathered by how far
 * each edge pixel is from the ground. A light patch inside the figure (a white shirt) is not reached,
 * since the fill never crosses the figure's outline. Returns a PNG, at most `size` px on its long edge.
 */
export async function cutOut(input: Buffer, size = 1024): Promise<Buffer> {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i: number) => [data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!] as const;

  // the ground: the median of the border, channel by channel
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const median = (c: number) => {
    const v = border.map((i) => data[i * 4 + c]!).sort((a, b) => a - b);
    return v[v.length >> 1]!;
  };
  const bg = [median(0), median(1), median(2)] as const;
  const dist = (i: number) => {
    const [r, g, b] = px(i);
    return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
  };

  const NEAR = 30; // within this of the ground: ground
  const FAR = 70; // beyond this: the figure, whole
  const ground = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  for (const i of border) {
    if (!ground[i] && dist(i) < NEAR) {
      ground[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w, y = (i / w) | 0;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of next) {
      if (n >= 0 && !ground[n] && dist(n) < NEAR) {
        ground[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // the contact shadow the models leave under the feet despite the prompt: grey, a little darker than the
  // ground, in the lowest band of the frame only (where no head or cap is), grown from the ground already taken
  const lum = (i: number) => 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  const bgLum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  const band = Math.floor(h * 0.8);
  const shadow = (i: number) => {
    const [r, g, b] = px(i);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const bgChroma = Math.max(...bg) - Math.min(...bg);
    const l = lum(i);
    return chroma <= bgChroma + 10 && l <= bgLum + 8 && l >= bgLum - 75;
  };
  head = 0;
  tail = 0;
  for (let i = band * w; i < w * h; i++) if (ground[i]) queue[tail++] = i;
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w, y = (i / w) | 0;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > band ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of next) {
      if (n >= 0 && !ground[n] && shadow(n)) {
        ground[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // ground the fill could not reach, shut in by the figure (between the legs, an arm and the waist): a patch
  // nearer the ground's colour than the fill allows, and big enough not to be a highlight on the figure
  const HOLE = NEAR * 0.6;
  const seen = new Uint8Array(w * h);
  const patch: number[] = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (ground[s0] || seen[s0] || dist(s0) >= HOLE) continue;
    patch.length = 0;
    seen[s0] = 1;
    patch.push(s0);
    for (let k = 0; k < patch.length; k++) {
      const i = patch[k]!;
      const x = i % w, y = (i / w) | 0;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (n >= 0 && !seen[n] && !ground[n] && dist(n) < HOLE) {
          seen[n] = 1;
          patch.push(n);
        }
      }
    }
    if (patch.length >= Math.max(64, (w * h) / 4000)) for (const i of patch) ground[i] = 1;
  }

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    if (ground[i]) {
      out[i * 4 + 3] = 0;
      continue;
    }
    // an edge pixel (next to the ground) is part ground: its alpha by how far it is from the ground's colour
    const x = i % w, y = (i / w) | 0;
    const edge = (x > 0 && ground[i - 1]) || (x < w - 1 && ground[i + 1]) || (y > 0 && ground[i - w]) || (y < h - 1 && ground[i + w]);
    if (edge) {
      const a = Math.min(1, Math.max(0, (dist(i) - NEAR) / (FAR - NEAR)));
      out[i * 4 + 3] = Math.round(Math.max(0.35, a) * 255);
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** The keep's body: the four draws, by view, or a finished 3D model. */
export const KeepBodySchema = z.union([
  z.strictObject({ front: z.string().uuid(), right: z.string().uuid(), back: z.string().uuid(), left: z.string().uuid() }),
  z.strictObject({ glb: z.string().uuid() }),
]);

export const DrawBodySchema = z.discriminatedUnion("step", [
  /** The front, from the student's pictures (refs from the uploads). */
  z.strictObject({ step: z.literal("front"), images: z.array(z.string().min(1).max(300)).min(1).max(MAX_AVATAR_IMAGES), note: z.string().max(NOTE_MAX).optional() }),
  /** The side views from a front draw: all three, or one again. */
  z.strictObject({ step: z.literal("turn"), front: z.string().uuid(), views: z.array(z.enum(SIDE_VIEWS)).min(1).max(3).optional() }),
  /** A 3D model from the kept views, once Meshy is configured. */
  z.strictObject({ step: z.literal("3d") }),
]);
export type DrawBody = z.infer<typeof DrawBodySchema>;

export const UploadsBodySchema = z.strictObject({
  files: z.array(z.strictObject({ mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), name: z.string().max(200).optional() })).min(1).max(MAX_AVATAR_IMAGES),
});
