import type { ReactNode } from "react";
import { ContextAnchor } from "./ContextAnchor";

type SectionHeaderProps = {
  bearing?: string;
  label: string;
  action?: ReactNode;
};

export function SectionHeader({ bearing, label, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        marginBottom: "var(--space-md)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <h2
        style={{
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <ContextAnchor mode="inline" label={label} bearing={bearing} />
      </h2>
      {action}
    </div>
  );
}
