import Link from "next/link";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div style={{
      padding: "48px 32px", textAlign: "center",
      background: "var(--s1)", border: "1px dashed var(--b)",
      borderRadius: "var(--r-card)",
    }}>
      <h3 style={{ fontFamily: "var(--font-garamond, var(--serif))", fontSize: "22px", fontWeight: 400, color: "var(--t)", marginBottom: "10px" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.7, marginBottom: ctaHref ? "24px" : 0, maxWidth: "360px", margin: "0 auto" }}>
        {description}
      </p>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn-primary" style={{ marginTop: "24px", display: "inline-flex" }}>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
