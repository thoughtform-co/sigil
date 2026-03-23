"use client";

import { ReactNode } from "react";
import { HudFrame } from "@/components/hud/HudFrame";

type BrandedWorkshopFrameProps = {
  children: ReactNode;
  /** Chapter label for workshop (e.g. "CHAPTER 01") */
  chapterLabel?: string;
  /** Pagination number */
  paginationLabel?: string;
};

export function BrandedWorkshopFrame({
  children,
  chapterLabel,
  paginationLabel,
}: BrandedWorkshopFrameProps) {
  return (
    <HudFrame
      chapterLabel={chapterLabel}
      paginationLabel={paginationLabel}
      showRails={true}
      enableScrollReveal={true}
    >
      {children}
    </HudFrame>
  );
}
