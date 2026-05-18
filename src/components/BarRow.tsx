"use client";

import { useCountUp } from "./useCountUp";

export default function BarRow({
  label,
  value,
  max = 100,
  color,
  tone = "mauve",
  swatch,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  tone?: "mauve" | "warn" | "good";
  swatch?: string;
}) {
  const animated = useCountUp(value);
  const p = Math.min(1, animated / max);
  const cls = tone === "warn" ? "warn" : tone === "good" ? "good" : "";

  return (
    <div className="bar-row">
      <div className="bar-label">
        {swatch && (
          <span className="swatch" style={{ background: swatch }} />
        )}
        <span>{label}</span>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill ${cls}`}
          style={
            color
              ? { transform: `scaleX(${p})`, background: color } as React.CSSProperties
              : { transform: `scaleX(${p})` } as React.CSSProperties
          }
        />
      </div>
      <div className="bar-value">
        <em>{Math.round(animated)}</em>
      </div>
    </div>
  );
}