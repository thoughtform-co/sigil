import type { ReactNode } from "react";
import { SectionLabel } from "./SectionLabel";

type SectionHeaderProps = {
  bearing: string;
  label: string;
  action?: ReactNode;
};

export function SectionHeader({ bearing, label, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        paddingBottom: "var(--space-sm)",
        borderBottom: "1px solid var(--dawn-08)",
        marginBottom: "var(--space-md)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <h2 style={{ margin: 0 }}>
        <SectionLabel bearing={bearing}>{label}</SectionLabel>
      </h2>
      {action}
    </div>
  );
}
