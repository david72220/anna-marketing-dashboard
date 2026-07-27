"use client";

const SURPERFORMANCE_THRESHOLD = 1.5;

export default function ScoreBadge({
  score,
  metrique,
}: {
  score: number | null;
  metrique: string;
}) {
  const metriqueLabel = metrique || "Vues";

  if (score === null) {
    return (
      <span
        title={`Score non calculable pour cette publication (compte trop récent ou moyenne de référence nulle) — métrique de référence : ${metriqueLabel}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-body)", color: "var(--fg-muted)" }}>
          —
        </span>
        <span style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)" }}>
          {metriqueLabel}
        </span>
      </span>
    );
  }

  const isSurperformance = score >= SURPERFORMANCE_THRESHOLD;

  return (
    <span
      title={`${score.toFixed(2)}× la moyenne habituelle du compte, calculé sur les ${metriqueLabel.toLowerCase()}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: isSurperformance ? "3px 10px" : "3px 8px",
        borderRadius: "var(--radius-pill)",
        background: isSurperformance ? "var(--green-l)" : "transparent",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--size-body)",
          color: isSurperformance ? "var(--green)" : "var(--fg)",
          fontWeight: isSurperformance ? "var(--weight-semibold)" : "var(--weight-regular)",
        }}
      >
        {score.toFixed(2)}×
      </span>
      <span
        style={{
          fontSize: "var(--size-tag)",
          color: isSurperformance ? "var(--green)" : "var(--fg-muted)",
        }}
      >
        {metriqueLabel}
      </span>
    </span>
  );
}
