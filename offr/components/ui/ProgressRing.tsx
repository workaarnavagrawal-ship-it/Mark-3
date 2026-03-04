"use client";

/**
 * ProgressRing — circular SVG progress indicator.
 * Typically used to show IB predicted total vs 45.
 */
interface ProgressRingProps {
  /** Current value (e.g. 38) */
  value: number;
  /** Maximum value (e.g. 45) */
  max: number;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Optional label inside the ring (defaults to "{value}") */
  label?: string;
  /** Optional sublabel below value (e.g. "/ 45") */
  sublabel?: string;
  /** Colour of the filled arc. Defaults to var(--acc) */
  color?: string;
  /** Colour of the track. Defaults to var(--b) */
  trackColor?: string;
}

export function ProgressRing({
  value,
  max,
  size = 88,
  strokeWidth = 6,
  label,
  sublabel,
  color = "var(--acc)",
  trackColor = "var(--b)",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, value / max));
  const dashOffset = circumference * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc (rotated so it starts at top) */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 500ms ease",
          }}
        />
      </svg>
      {/* Centre label */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 500, color: "var(--t)" }}>
          {label ?? value}
        </span>
        {sublabel && (
          <span style={{ fontSize: size * 0.14, color: "var(--t3)", marginTop: 2 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
