"use client";

import { useState, useEffect } from "react";

export function useCountUp(
  target: number,
  duration = 1400,
  deps: unknown[] = []
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const animate = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(animate);
      else setValue(target);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, ...deps]);

  return value;
}