"use client";

export default function Sparkline({
  points,
  color = "var(--mauve)",
  width = 120,
  height = 40,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const d = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const gradientId = `sg-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      className="kpi-spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradientId})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}