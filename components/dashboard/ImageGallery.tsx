"use client";

import { ImageDiskStack, type ImageDiskStackImage } from "@/components/journeys/ImageDiskStack";

type GalleryItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  width: number | null;
  height: number | null;
  prompt: string;
  modelId: string;
  sessionName: string;
  projectName: string;
};

type ImageGalleryProps = {
  items: GalleryItem[];
};

const STACK_SIZE = 6;

function toStackImage(item: GalleryItem): ImageDiskStackImage {
  return {
    id: item.id,
    fileUrl: item.fileUrl,
    fileType: item.fileType,
    width: item.width,
    height: item.height,
  };
}

export function ImageGallery({ items }: ImageGalleryProps) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-2xl)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn-30)",
          textAlign: "center",
        }}
      >
        No generations yet
      </div>
    );
  }

  const stacks: ImageDiskStackImage[][] = [];
  for (let i = 0; i < items.length; i += STACK_SIZE) {
    stacks.push(items.slice(i, i + STACK_SIZE).map(toStackImage));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "var(--space-lg)",
      }}
      className="dashboard-gallery-grid"
    >
      {stacks.map((stackImages, index) => (
        <div
          key={stackImages.map((img) => img.id).join("-")}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 0.06}s` }}
        >
          <ImageDiskStack images={stackImages} size="md" />
        </div>
      ))}
    </div>
  );
}
