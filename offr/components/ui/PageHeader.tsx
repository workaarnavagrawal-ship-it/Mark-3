export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: "48px" }}>
      {eyebrow && <p className="label" style={{ marginBottom: "12px" }}>{eyebrow}</p>}
      <h1 style={{
        fontFamily: "var(--font-garamond, var(--serif))",
        fontSize: "44px", fontWeight: 400, letterSpacing: "-0.025em",
        color: "var(--t)", marginBottom: description ? "14px" : 0,
        lineHeight: 1.1,
      }}>
        {title}
      </h1>
      {description && (
        <p style={{ fontSize: "15px", color: "var(--t3)", lineHeight: 1.7, maxWidth: "560px" }}>
          {description}
        </p>
      )}
    </div>
  );
}
