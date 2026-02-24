"use client";

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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "var(--space-md)",
      }}
      className="dashboard-gallery-grid"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="group animate-fade-in-up"
          style={{
            animationDelay: `${index * 0.06}s`,
          }}
        >
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative overflow-hidden transition-all"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--dawn-08)",
              aspectRatio: "3/4",
              transitionDuration: "var(--duration-base)",
              transitionTimingFunction: "var(--ease-out)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "var(--dawn-15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--dawn-08)";
            }}
          >
            {/* Corner brackets on hover */}
            <span
              className="pointer-events-none absolute -left-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                width: "14px",
                height: "14px",
                borderTop: "1px solid var(--gold)",
                borderLeft: "1px solid var(--gold)",
                transitionDuration: "var(--duration-base)",
              }}
            />
            <span
              className="pointer-events-none absolute -right-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                width: "14px",
                height: "14px",
                borderTop: "1px solid var(--gold)",
                borderRight: "1px solid var(--gold)",
                transitionDuration: "var(--duration-base)",
              }}
            />
            <span
              className="pointer-events-none absolute -bottom-px -left-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                width: "14px",
                height: "14px",
                borderBottom: "1px solid var(--gold)",
                borderLeft: "1px solid var(--gold)",
                transitionDuration: "var(--duration-base)",
              }}
            />
            <span
              className="pointer-events-none absolute -bottom-px -right-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                width: "14px",
                height: "14px",
                borderBottom: "1px solid var(--gold)",
                borderRight: "1px solid var(--gold)",
                transitionDuration: "var(--duration-base)",
              }}
            />

            {/* Media */}
            <div className="absolute inset-0">
              {item.fileType.startsWith("video") ? (
                <video
                  src={item.fileUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={item.fileUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>

            {/* Glassmorphism overlay */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(10, 9, 8, 0.6)",
                backdropFilter: "blur(12px)",
                borderTop: "1px solid var(--dawn-08)",
                padding: "8px 10px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.06em",
                  color: "var(--dawn-50)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginBottom: "4px",
                }}
              >
                {item.prompt}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  color: "var(--dawn-30)",
                  textTransform: "uppercase",
                }}
              >
                {item.modelId}
              </p>
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}
