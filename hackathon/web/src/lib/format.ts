export const pct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;

export const signed = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(digits)}`;

export const int = (v: number) => v.toLocaleString("en-US");

export const ratio = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(2));
