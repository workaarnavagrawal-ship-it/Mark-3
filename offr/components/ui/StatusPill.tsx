import type { TrackerEntry } from "@/lib/types";

type Band = "Safe" | "Target" | "Reach";

const STYLES: Record<Band, React.CSSProperties> = {
  Safe:   { background: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { background: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)" },
  Reach:  { background: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)" },
};

export function StatusPill({ band }: { band: Band }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      borderRadius: "9999px", padding: "3px 12px",
      fontSize: "12px", letterSpacing: "0.02em",
      ...STYLES[band],
    }}>
      {band}
    </span>
  );
}

export function statusStyle(band: string) {
  return STYLES[band as Band] ?? STYLES.Reach;
}
