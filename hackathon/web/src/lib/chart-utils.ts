import { useLayoutEffect, useRef, useState } from "react";

export type Bin = { min: number; max: number; label: string };

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function binIndex(bins: Bin[], v: number) {
  const i = bins.findIndex((b) => v < b.max);
  return i === -1 ? bins.length - 1 : i;
}

