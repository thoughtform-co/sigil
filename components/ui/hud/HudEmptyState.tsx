"use client";

import { ReactNode } from "react";

type HudEmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function HudEmptyState({ title, body, action, className = "" }: HudEmptyStateProps) {
  return (
    <div className={`hud-panel-empty ${className}`.trim()}>
      <p className="hud-panel-empty-title">{title}</p>
      <p className="hud-panel-empty-body">{body}</p>
      {action != null ? action : null}
    </div>
  );
}
