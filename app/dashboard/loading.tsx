export default function DashboardLoading() {
  return (
    <div className="flex items-center gap-3 py-12">
      <div
        style={{
          width: "6px",
          height: "6px",
          background: "var(--gold)",
          animation: "glowPulse 1.5s ease-in-out infinite",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn-30)",
        }}
      >
        Loading dashboard...
      </span>
    </div>
  );
}
