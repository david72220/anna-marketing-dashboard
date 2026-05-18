"use client";

import { useCountUp } from "./useCountUp";

export default function Gauge({
  value,
  max = 100,
  size = 160,
  stroke = 12,
  label,
  color,
  suffix = "/100",
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  suffix?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const animated = useCountUp(value);
  const pct = Math.min(1, animated / max);
  const offset = c * (1 - pct);
  const fillColor =
    color || (value < 50 ? "#B26B6B" : value < 75 ? "var(--mauve)" : "var(--green)");

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="gauge-track"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="gauge-fill"
          strokeWidth={stroke}
          stroke={fillColor}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center" style={{ inset: 0 }}>
        <div className="gauge-value">
          <em>{Math.round(animated)}</em>
          <span
            style={{
              fontSize: 14,
              color: "var(--fg-muted)",
              fontStyle: "italic",
            }}
          >
            {suffix}
          </span>
        </div>
        {label && <div className="gauge-label">{label}</div>}
      </div>
    </div>
  );
}