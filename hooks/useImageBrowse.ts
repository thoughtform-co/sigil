import useSWRInfinite from "swr/infinite";
import { useCallback, useRef, useEffect } from "react";

export interface BrowseImage {
  id: string;
  url: string;
  prompt: string;
  generationId: string;
  sessionName?: string;
  projectId?: string;
  projectName?: string;
  isApproved: boolean;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface ProjectImagesPage {
  data: BrowseImage[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CrossProjectImagesPage {
  data: BrowseImage[];
  projects: Array<{ id: string; name: string }>;
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 40;

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch images");
  return res.json();
}

export function useProjectImages(projectId: string, enabled: boolean) {
  const result = useSWRInfinite<ProjectImagesPage>(
    (pageIndex, previousPageData) => {
      if (!enabled || !projectId) return null;
      if (pageIndex > 0 && !previousPageData?.hasMore) return null;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (previousPageData?.nextCursor) {
        params.set("cursor", previousPageData.nextCursor);
      }
      return `/api/projects/${projectId}/images?${params}`;
    },
    fetcher<ProjectImagesPage>,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 2 * 60 * 1000,
    },
  );

  const allImages = result.data?.flatMap((page) => page.data) ?? [];
  const hasNextPage = result.data?.[result.data.length - 1]?.hasMore ?? false;

  return {
    ...result,
    allImages,
    hasNextPage,
    isFetchingNextPage: result.isValidating && (result.data?.length ?? 0) > 0,
    fetchNextPage: () => result.setSize(result.size + 1),
  };
}

export function useCrossProjectImages(
  enabled: boolean,
  filterProjectId?: string,
) {
  const result = useSWRInfinite<CrossProjectImagesPage>(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (pageIndex > 0 && !previousPageData?.hasMore) return null;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (previousPageData?.nextCursor) {
        params.set("cursor", previousPageData.nextCursor);
      }
      if (filterProjectId) params.set("projectId", filterProjectId);
      return `/api/images/browse?${params}`;
    },
    fetcher<CrossProjectImagesPage>,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 2 * 60 * 1000,
    },
  );

  const allImages = result.data?.flatMap((page) => page.data) ?? [];
  const allProjects = (() => {
    const map = new Map<string, { id: string; name: string }>();
    result.data?.forEach((page) => {
      page.projects?.forEach((p) => map.set(p.id, p));
    });
    return Array.from(map.values());
  })();
  const hasNextPage = result.data?.[result.data.length - 1]?.hasMore ?? false;

  return {
    ...result,
    allImages,
    allProjects,
    hasNextPage,
    isFetchingNextPage: result.isValidating && (result.data?.length ?? 0) > 0,
    fetchNextPage: () => result.setSize(result.size + 1),
  };
}

export function useLoadMoreObserver(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [observerCallback]);

  return sentinelRef;
}
