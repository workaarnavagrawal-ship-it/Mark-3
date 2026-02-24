import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
  onClick,
  hoverable = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--s1)",
        border: "1px solid var(--b)",
        borderRadius: "var(--r-card)",
        padding: "24px",
        cursor: onClick ? "pointer" : "default",
        transition: hoverable ? "border-color 150ms ease, background 150ms ease" : undefined,
        ...style,
      }}
      onMouseEnter={hoverable ? e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)";
        (e.currentTarget as HTMLElement).style.background = "var(--s2)";
      } : undefined}
      onMouseLeave={hoverable ? e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--b)";
        (e.currentTarget as HTMLElement).style.background = "var(--s1)";
      } : undefined}
    >
      {children}
    </div>
  );
}
