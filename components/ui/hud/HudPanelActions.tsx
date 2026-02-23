"use client";

import { ReactNode } from "react";

type HudPanelActionsProps = {
  children: ReactNode;
  className?: string;
};

export function HudPanelActions({ children, className = "" }: HudPanelActionsProps) {
  return <div className={`hud-panel-actions ${className}`.trim()}>{children}</div>;
}
