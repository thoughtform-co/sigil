"use client";

import Link from "next/link";
import { RouteCard, type RouteCardItem } from "@/components/journeys/RouteCard";

type CreationHubProps = {
  journeyName: string;
  journeyDescription: string | null;
  routes: RouteCardItem[];
  onCreateRoute: () => void;
};

export function CreationHub({
  journeyName,
  journeyDescription,
  routes,
  onCreateRoute,
}: CreationHubProps) {
  return (
    <div style={{ width: "100%", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(18px, 1rem + 0.6vw, 24px)",
            fontWeight: 400,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn)",
            margin: "0 0 6px",
          }}
        >
          {journeyName}
        </h1>
        {journeyDescription && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--dawn-50)",
              maxWidth: 560,
            }}
          >
            {journeyDescription}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
          paddingBottom: "var(--space-sm)",
          borderBottom: "1px solid var(--dawn-08)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
          }}
        >
          {routes.length} route{routes.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="sigil-btn-secondary"
          onClick={onCreateRoute}
        >
          + create route
        </button>
      </div>

      {/* Route grid */}
      {routes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route, index) => (
            <div
              key={route.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <RouteCard route={route} />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "var(--space-2xl)",
            textAlign: "center",
            border: "1px dashed var(--dawn-15)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn-30)",
              marginBottom: "var(--space-md)",
            }}
          >
            No routes yet
          </div>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              color: "var(--dawn-40)",
              lineHeight: 1.6,
              marginBottom: "var(--space-lg)",
            }}
          >
            Create a route to start generating images and videos.
          </p>
          <button
            type="button"
            className="sigil-btn-primary"
            onClick={onCreateRoute}
          >
            + create first route
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Shown when a journey is type=learn but has no curriculum content mapped yet.
 */
export function LearnEmptyState({ journeyName, onOpenCreation }: { journeyName: string; onOpenCreation?: () => void }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        padding: "var(--space-2xl)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          background: "var(--gold)",
          transform: "rotate(45deg)",
          margin: "0 auto var(--space-lg)",
        }}
      />
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "14px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn)",
          marginBottom: "var(--space-sm)",
        }}
      >
        Curriculum coming soon
      </h2>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
          lineHeight: 1.7,
          color: "var(--dawn-50)",
          marginBottom: "var(--space-xl)",
        }}
      >
        The learning content for {journeyName} is being prepared. In the meantime, you can use the
        creation suite to start generating.
      </p>
      {onOpenCreation && (
        <button
          type="button"
          className="sigil-btn-secondary"
          onClick={onOpenCreation}
        >
          Open creation suite &rarr;
        </button>
      )}
    </div>
  );
}
