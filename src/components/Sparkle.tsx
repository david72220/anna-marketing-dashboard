"use client";

export default function Sparkle({
  size = 18,
  top,
  left,
  right,
  bottom,
  delay = 0,
  opacity = 0.5,
}: {
  size?: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  delay?: number;
  opacity?: number;
}) {
  const dur = 3 + (size % 7) * 0.3;

  return (
    <svg
      className="deco-sparkle"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        top,
        left,
        right,
        bottom,
        opacity,
        animationName: "sparkleTwinkle",
        animationDuration: `${dur}s`,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
        animationDelay: `${delay}s`,
      }}
    >
      <path
        d="M12 2L13 10L21 12L13 14L12 22L11 14L3 12L11 10Z"
        fill="var(--mauve)"
      />
    </svg>
  );
}