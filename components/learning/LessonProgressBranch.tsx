"use client";

import { createPortal } from "react-dom";
import { useNavSpine } from "@/context/NavSpineContext";
import { useEffect, useState } from "react";
import type { ContentBlock } from "@/lib/learning/types";
import { NAV_SPINE_CARD_WIDTH } from "@/components/hud/NavigationFrame";

function blockLabel(block: ContentBlock): string {
  if (block.type === "narrative") return block.heading ?? "Section";
  if (block.type === "example") return block.caption ?? "Example";
  if (block.type === "quiz") return "Exercise";
  if (block.type === "practice") return "Practice";
  if (block.type === "particle-scene") return block.title ?? "Interactive";
  return "Section";
}

type LessonProgressBranchProps = {
  blocks: ContentBlock[];
  activeBlockIdx: number;
  onScrollToBlock: (idx: number) => void;
};

export function LessonProgressBranch({
  blocks,
  activeBlockIdx,
  onScrollToBlock,
}: LessonProgressBranchProps) {
  const { portalRef } = useNavSpine();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !portalRef.current) return null;

  const content = (
    <div
      style={{
        marginTop: 16,
        width: NAV_SPINE_CARD_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--dawn-30)",
          marginBottom: 8,
        }}
      >
        SECTIONS
      </div>
      {blocks.map((block, idx) => {
        const label = blockLabel(block);
        const isActive = idx === activeBlockIdx;
        const isPassed = idx < activeBlockIdx;
        return (
          <button
            key={block.id}
            type="button"
            onClick={() => onScrollToBlock(idx)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
              cursor: "pointer",
              background: "none",
              border: "none",
              textAlign: "left",
              width: "100%",
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              color: isActive ? "var(--gold)" : "var(--dawn-50)",
              transition: "color 120ms",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                minWidth: 5,
                transform: "rotate(45deg)",
                background: isActive
                  ? "var(--gold)"
                  : isPassed
                    ? "var(--dawn-50)"
                    : "var(--dawn-30)",
                transition: "background 120ms",
              }}
            />
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(content, portalRef.current);
}
