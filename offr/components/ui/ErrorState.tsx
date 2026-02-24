export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      padding: "20px 24px",
      background: "var(--rch-bg)", border: "1px solid var(--rch-b)",
      borderRadius: "var(--r-card)", maxWidth: "480px",
    }}>
      <p style={{ fontSize: "14px", color: "var(--rch-t)", marginBottom: onRetry ? "14px" : 0, lineHeight: 1.6 }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost" style={{ fontSize: "13px", padding: "8px 16px" }}>
          Try again
        </button>
      )}
    </div>
  );
}
