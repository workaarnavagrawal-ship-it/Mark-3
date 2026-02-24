export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size,
      border: "1.5px solid var(--b-strong)",
      borderTopColor: "var(--t2)",
      borderRadius: "50%",
      animation: "offr-spin 0.8s linear infinite",
    }} />
  );
}

export function LoadingPage({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ padding: "52px 56px", display: "flex", alignItems: "center", gap: "14px" }}>
      <LoadingSpinner />
      <span style={{ fontSize: "14px", color: "var(--t3)" }}>{label}</span>
      <style>{`@keyframes offr-spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: "16px", borderRadius: "6px",
          background: "var(--s2)",
          width: i === lines - 1 ? "60%" : "100%",
          animation: "offr-pulse 1.5s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes offr-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
    </div>
  );
}
