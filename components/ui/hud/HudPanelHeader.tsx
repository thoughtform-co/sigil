"use client";

import { ReactNode } from "react";

type HudPanelHeaderProps = {
  title: string;
  actions?: ReactNode;
  className?: string;
};

export function HudPanelHeader({ title, actions, className = "" }: HudPanelHeaderProps) {
  return (
    <div className={`hud-panel-header ${className}`.trim()}>
      <span className="sigil-section-label">{title}</span>
      {actions != null ? <div className="hud-panel-actions">{actions}</div> : null}
    </div>
  );
}
