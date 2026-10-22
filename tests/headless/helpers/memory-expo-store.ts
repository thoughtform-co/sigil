import type { StoredAvatar } from "@/lib/headless/avatar";
import type { Assignments, ExpoStore, PlotDoc, PostRecord, StoredHandIn } from "@/lib/headless/expo";

export type MemoryExpoStore = ExpoStore & {
  files: Map<string, PlotDoc>;
  assignments: Assignments;
  posts: Map<string, PostRecord>;
  handIns: Map<string, StoredHandIn>;
  avatars: Map<string, StoredAvatar>;
  cutouts: Map<string, Buffer>;
};

/** Expo City's store in memory: plots and versions, assignments, post records and hand-ins. */
export function memoryExpoStore(users: Record<string, string> = {}): MemoryExpoStore {
  const files = new Map<string, PlotDoc>();
  const posts = new Map<string, PostRecord>();
  const handIns = new Map<string, StoredHandIn>();
  const avatars = new Map<string, StoredAvatar>();
  const cutouts = new Map<string, Buffer>();
  let assignments: Assignments = {};
  return {
    posts,
    handIns,
    avatars,
    cutouts,
    readAvatar: async (id) => structuredClone(avatars.get(id) ?? null),
    async writeAvatar(id, a) {
      avatars.set(id, structuredClone(a));
    },
    async writeCutout(id, name, png) {
      cutouts.set(`${id}/${name}`, png);
      return `https://x.supabase.co/storage/v1/object/public/outputs/expo/avatar/${id}/${name}.png`;
    },
    readPost: async (p) => structuredClone(posts.get(p) ?? {}),
    async writePost(p, r) {
      posts.set(p, structuredClone(r));
    },
    readHandIn: async (p, m) => structuredClone(handIns.get(`${p}/${m}`) ?? null),
    async writeHandIn(p, m, h) {
      handIns.set(`${p}/${m}`, structuredClone(h));
    },
    files,
    get assignments() {
      return assignments;
    },
    readPlot: async (p) => structuredClone(files.get(`${p}`) ?? null),
    readVersion: async (p, v) => structuredClone(files.get(`${p}/v${v}`) ?? null),
    async writePlot(doc) {
      files.set(`${doc.plot}/v${doc.version}`, structuredClone(doc));
      files.set(doc.plot, structuredClone(doc));
    },
    listPlots: async () => [...files.entries()].filter(([k]) => /^N\d\d$/.test(k)).map(([, d]) => structuredClone(d)),
    readAssignments: async () => structuredClone(assignments),
    async writeAssignments(a) {
      assignments = structuredClone(a);
    },
    findOwnerByEmail: async (email) => users[email.toLowerCase()] ?? null,
  };
}
