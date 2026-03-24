import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import type { SessionItem, GenerationItem } from "@/components/generation/types";

const PREFETCH_LIMIT = 20;

export type PrefetchedWorkspaceData = {
  projectName: string;
  journeyId?: string;
  journeyName?: string;
  sessions: SessionItem[];
  generationsPage?: { generations: GenerationItem[]; nextCursor: string | null };
  includesGenerationOutputs: boolean;
} | null;

export async function prefetchWorkspaceData(
  projectId: string,
): Promise<PrefetchedWorkspaceData> {
  try {
    const user = await getAuthedUser();
    if (!user) return null;

    const [profile, accessFilter] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
      projectAccessFilter(user.id),
    ]);

    const isAdmin = profile?.role === "admin";
    const projectWhere = isAdmin
      ? { id: projectId }
      : { id: projectId, ...accessFilter };

    const generationSelect = {
      id: true,
      sessionId: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      status: true,
      modelId: true,
      createdAt: true,
      source: true,
      errorMessage: true,
      errorCategory: true,
      errorRetryable: true,
      lastHeartbeatAt: true,
      outputs: {
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          isApproved: true,
          width: true,
          height: true,
          duration: true,
        },
      },
    } as const;

    const project = await prisma.project.findFirst({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        workspaceProject: { select: { id: true, name: true } },
      },
    });

    if (!project) return null;

    const [sessionsRaw, generationsRaw] = await Promise.all([
      prisma.session.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, type: true, updatedAt: true },
      }),
      prisma.generation.findMany({
        where: { session: { projectId } },
        orderBy: { createdAt: "asc" },
        take: PREFETCH_LIMIT + 1,
        select: generationSelect,
      }),
    ]);

    const sessions: SessionItem[] = sessionsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      updatedAt: s.updatedAt.toISOString(),
    }));

    const hasMore = generationsRaw.length > PREFETCH_LIMIT;
    const items = hasMore ? generationsRaw.slice(0, PREFETCH_LIMIT) : generationsRaw;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const generations: GenerationItem[] = items.map((g) => ({
      id: g.id,
      sessionId: g.sessionId,
      prompt: g.prompt,
      negativePrompt: g.negativePrompt,
      parameters: g.parameters as Record<string, unknown>,
      status: g.status,
      modelId: g.modelId,
      createdAt: g.createdAt.toISOString(),
      source: g.source,
      errorMessage: g.errorMessage,
      errorCategory: g.errorCategory,
      errorRetryable: g.errorRetryable,
      lastHeartbeatAt: g.lastHeartbeatAt?.toISOString() ?? null,
      outputs: g.outputs.map((o) => ({
        id: o.id,
        fileUrl: o.fileUrl,
        fileType: o.fileType,
        isApproved: o.isApproved,
        width: o.width,
        height: o.height,
        duration: o.duration,
      })),
    }));

    const payload: NonNullable<PrefetchedWorkspaceData> = {
      projectName: project.name,
      journeyId: project.workspaceProject?.id,
      journeyName: project.workspaceProject?.name,
      sessions,
      generationsPage: { generations, nextCursor },
      includesGenerationOutputs: true,
    };
    return payload;
  } catch {
    return null;
  }
}

/**
 * Lightweight prefetch for the route layout — fetches project info, sessions,
 * and the latest generation page so the route opens on the newest content
 * without a client-side scroll cascade.
 */
export async function prefetchWorkspaceShell(
  projectId: string,
): Promise<PrefetchedWorkspaceData> {
  try {
    const user = await getAuthedUser();
    if (!user) return null;

    const [profile, accessFilter] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
      projectAccessFilter(user.id),
    ]);

    const isAdmin = profile?.role === "admin";
    const projectWhere = isAdmin
      ? { id: projectId }
      : { id: projectId, ...accessFilter };

    const generationSelect = {
      id: true,
      sessionId: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      status: true,
      modelId: true,
      createdAt: true,
      source: true,
      errorMessage: true,
      errorCategory: true,
      errorRetryable: true,
      lastHeartbeatAt: true,
      outputs: {
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          isApproved: true,
          width: true,
          height: true,
          duration: true,
        },
      },
    } as const;

    const project = await prisma.project.findFirst({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        workspaceProject: { select: { id: true, name: true } },
      },
    });

    if (!project) return null;

    const [sessionsRaw, generationsRaw] = await Promise.all([
      prisma.session.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, type: true, updatedAt: true },
      }),
      prisma.generation.findMany({
        where: { session: { projectId } },
        orderBy: { createdAt: "desc" },
        take: PREFETCH_LIMIT,
        select: generationSelect,
      }),
    ]);

    const sessions: SessionItem[] = sessionsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      updatedAt: s.updatedAt.toISOString(),
    }));

    generationsRaw.reverse();

    const generations: GenerationItem[] = generationsRaw.map((g) => ({
      id: g.id,
      sessionId: g.sessionId,
      prompt: g.prompt,
      negativePrompt: g.negativePrompt,
      parameters: g.parameters as Record<string, unknown>,
      status: g.status,
      modelId: g.modelId,
      createdAt: g.createdAt.toISOString(),
      source: g.source,
      errorMessage: g.errorMessage,
      errorCategory: g.errorCategory,
      errorRetryable: g.errorRetryable,
      lastHeartbeatAt: g.lastHeartbeatAt?.toISOString() ?? null,
      outputs: g.outputs.map((o) => ({
        id: o.id,
        fileUrl: o.fileUrl,
        fileType: o.fileType,
        isApproved: o.isApproved,
        width: o.width,
        height: o.height,
        duration: o.duration,
      })),
    }));

    return {
      projectName: project.name,
      journeyId: project.workspaceProject?.id,
      journeyName: project.workspaceProject?.name,
      sessions,
      generationsPage: { generations, nextCursor: null },
      includesGenerationOutputs: true,
    };
  } catch {
    return null;
  }
}
