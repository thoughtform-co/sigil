"use client";

import { ReactNode } from "react";

type HudPanelHeaderProps = {
  title: string;
  inlineActions?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function HudPanelHeader({ title, inlineActions, actions, className = "" }: HudPanelHeaderProps) {
  return (
    <div className={`hud-panel-header ${className}`.trim()}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <span className="sigil-section-label">{title}</span>
        {inlineActions}
      </div>
      {actions != null ? <div className="hud-panel-actions">{actions}</div> : null}
    </div>
  );
}
