import type { Dataset } from "./data";

/** Expected model risk (%) for a group when each lever reaches coverage p[i] (0–1), assigned independently.
 *  Exact for the precomputed 2^k subset aggregates: sum_S prod_{i in S} p_i prod_{i not in S} (1 - p_i) risk(S). */
export function expectedRisk(risk: number[], p: number[]) {
  let total = 0;
  for (let mask = 0; mask < risk.length; mask++) {
    let w = 1;
    for (let i = 0; i < p.length; i++) w *= mask & (1 << i) ? p[i] : 1 - p[i];
    if (w) total += w * risk[mask];
  }
  return total;
}

/** Projected stunting rate: the official estimate plus the model-predicted change. */
export function projected(data: Dataset, group: string, p: number[]) {
  const risk = data.scenarios.risk[group];
  const official = group === "Rwanda" ? data.national.stunting.value : data.districts.find((d) => d.name === group)!.stunting.value;
  return { official, value: official + expectedRisk(risk, p) - risk[0] };
}

/** Contribution of each lever at the current settings: how much the rate rises if that lever alone is set back to 0. */
export function contributions(data: Dataset, group: string, p: number[]) {
  const risk = data.scenarios.risk[group];
  const now = expectedRisk(risk, p);
  return p.map((_, i) => expectedRisk(risk, p.map((v, j) => (j === i ? 0 : v))) - now);
}
