"use client";

import { ReactNode } from "react";

type HudPanelProps = {
  children: ReactNode;
  className?: string;
};

export function HudPanel({ children, className = "" }: HudPanelProps) {
  return <div className={`hud-panel ${className}`.trim()}>{children}</div>;
}
