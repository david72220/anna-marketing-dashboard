"use client";

import { useCountUp } from "./useCountUp";

export default function Counter({
  value,
  decimals = 0,
  suffix = "",
  italic = false,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  italic?: boolean;
}) {
  const v = useCountUp(value);
  const display = v.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <>
      {italic ? <em>{display}</em> : display}
      {suffix}
    </>
  );
}