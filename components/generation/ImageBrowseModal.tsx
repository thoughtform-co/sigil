"use client";

import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import {
  useProjectImages,
  useCrossProjectImages,
  useLoadMoreObserver,
  type BrowseImage,
} from "@/hooks/useImageBrowse";
import styles from "./ImageBrowseModal.module.css";

type ImageBrowseModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  projectId: string;
};

export function ImageBrowseModal({
  open,
  onClose,
  onSelectImage,
  projectId,
}: ImageBrowseModalProps) {
  const [activeTab, setActiveTab] = useState<"project" | "all">("project");
  const [searchQuery, setSearchQuery] = useState("");
  const [crossProjectFilter, setCrossProjectFilter] = useState<
    string | undefined
  >(undefined);

  const projectQuery = useProjectImages(
    projectId,
    open && activeTab === "project",
  );
  const crossQuery = useCrossProjectImages(
    open && activeTab === "all",
    crossProjectFilter,
  );

  const activeImages =
    activeTab === "project" ? projectQuery.allImages : crossQuery.allImages;

  const filteredImages = useMemo(() => {
    if (!searchQuery) return activeImages;
    const q = searchQuery.toLowerCase();
    return activeImages.filter((img) =>
      img.prompt.toLowerCase().includes(q),
    );
  }, [activeImages, searchQuery]);

  const activeHasNext =
    activeTab === "project"
      ? projectQuery.hasNextPage
      : crossQuery.hasNextPage;
  const activeFetchingNext =
    activeTab === "project"
      ? projectQuery.isFetchingNextPage
      : crossQuery.isFetchingNextPage;
  const activeFetchNext =
    activeTab === "project"
      ? projectQuery.fetchNextPage
      : crossQuery.fetchNextPage;
  const activeIsLoading =
    activeTab === "project" ? projectQuery.isLoading : crossQuery.isLoading;

  const sentinelRef = useLoadMoreObserver(
    activeHasNext,
    activeFetchingNext,
    activeFetchNext,
  );

  const handleSelect = useCallback(
    (url: string) => {
      onSelectImage(url);
      onClose();
    },
    [onSelectImage, onClose],
  );

  const handleTabChange = useCallback((tab: "project" | "all") => {
    setActiveTab(tab);
    setSearchQuery("");
    setCrossProjectFilter(undefined);
  }, []);

  const handleChipClick = useCallback(
    (pid: string | undefined) => {
      setCrossProjectFilter(pid === crossProjectFilter ? undefined : pid);
    },
    [crossProjectFilter],
  );

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const totalLoaded = activeImages.length;
  const showCount = filteredImages.length;

  if (!open || typeof document === "undefined") return null;

  const groupedByProject = (() => {
    if (activeTab !== "all" || crossProjectFilter) return null;
    const groups = new Map<
      string,
      { projectName: string; images: BrowseImage[] }
    >();
    for (const img of filteredImages) {
      const pid = img.projectId || "unknown";
      if (!groups.has(pid)) {
        groups.set(pid, {
          projectName: img.projectName || "Unknown",
          images: [],
        });
      }
      groups.get(pid)!.images.push(img);
    }
    return groups.size > 1 ? groups : null;
  })();

  const panel = (
    <div
      className={styles.backdrop}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="browse-images-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Telemetry bar */}
        <header className={styles.telemetryBar} id="browse-images-title">
          <span className={styles.telemetryBrand}>BROWSE GENERATIONS</span>
          {!activeIsLoading && totalLoaded > 0 && (
            <span className={styles.telemetryCount}>
              {searchQuery
                ? `${showCount} / ${totalLoaded}`
                : totalLoaded}
              {" "}image{totalLoaded !== 1 ? "s" : ""}
              {activeHasNext ? "+" : ""}
            </span>
          )}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.tabRow}>
            <div className={styles.tabGroup}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "project" ? styles.tabActive : ""}`}
                onClick={() => handleTabChange("project")}
              >
                This Route
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabActive : ""}`}
                onClick={() => handleTabChange("all")}
              >
                All Routes
              </button>
            </div>
          </div>

          <div className={styles.searchRow}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by prompt…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === "all" && crossQuery.allProjects.length > 1 && (
            <div className={styles.chipRow}>
              <button
                type="button"
                className={`${styles.chip} ${!crossProjectFilter ? styles.chipActive : ""}`}
                onClick={() => setCrossProjectFilter(undefined)}
              >
                All
              </button>
              {crossQuery.allProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip} ${crossProjectFilter === p.id ? styles.chipActive : ""}`}
                  onClick={() => handleChipClick(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid body */}
        <div className={styles.gridBody}>
          {groupedByProject ? (
            <>
              {Array.from(groupedByProject.entries()).map(([pid, group]) => (
                <div key={pid}>
                  <div className={styles.groupHeading}>
                    <span className={styles.groupName}>
                      {group.projectName}
                    </span>
                    <div className={styles.groupDivider} />
                    <span className={styles.groupCount}>
                      {group.images.length} image
                      {group.images.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.grid}>
                    {group.images.map((img) => (
                      <ImageThumbnail
                        key={img.id}
                        image={img}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div ref={sentinelRef} className={styles.sentinel} />
              {activeFetchingNext && (
                <div className={styles.spinnerRow}>
                  <div className={styles.spinner} />
                </div>
              )}
            </>
          ) : (
            <ImageGrid
              images={filteredImages}
              isLoading={activeIsLoading}
              isFetchingMore={activeFetchingNext}
              sentinelRef={sentinelRef}
              onSelect={handleSelect}
              showProjectBadge={activeTab === "all"}
              emptyMessage="No images found"
              emptySubMessage={
                activeTab === "project"
                  ? "Generate some images first to browse them here"
                  : "Images from routes you have access to will appear here"
              }
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

function ImageGrid({
  images,
  isLoading,
  isFetchingMore,
  sentinelRef,
  onSelect,
  showProjectBadge,
  emptyMessage,
  emptySubMessage,
}: {
  images: BrowseImage[];
  isLoading: boolean;
  isFetchingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (url: string) => void;
  showProjectBadge?: boolean;
  emptyMessage: string;
  emptySubMessage: string;
}) {
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>{emptyMessage}</p>
        <p className={styles.emptySub}>{emptySubMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {images.map((img) => (
          <ImageThumbnail
            key={img.id}
            image={img}
            onSelect={onSelect}
            showProjectBadge={showProjectBadge}
          />
        ))}
      </div>
      <div ref={sentinelRef} className={styles.sentinel} />
      {isFetchingMore && (
        <div className={styles.spinnerRow}>
          <div className={styles.spinner} />
        </div>
      )}
    </>
  );
}

const ImageThumbnail = memo(function ImageThumbnail({
  image,
  onSelect,
  showProjectBadge,
}: {
  image: BrowseImage;
  onSelect: (url: string) => void;
  showProjectBadge?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <button
      type="button"
      className={styles.thumb}
      onClick={() => onSelect(image.url)}
      title={image.prompt}
    >
      {!loaded && !errored && <div className={styles.thumbSkeleton} />}

      {!errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.prompt}
          className={`${styles.thumbImg} ${!loaded ? styles.thumbImgHidden : ""}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className={styles.thumbError}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}

      {/* Bookmark badge */}
      {image.isApproved && (
        <div className={styles.bookmarkBadge}>
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
      )}

      {/* Project badge (cross-project) */}
      {showProjectBadge && image.projectName && (
        <span className={styles.projectBadge}>{image.projectName}</span>
      )}

      {/* Hover overlay with prompt */}
      <div className={styles.thumbOverlay}>
        <span className={styles.thumbPrompt}>{image.prompt}</span>
      </div>
    </button>
  );
});
