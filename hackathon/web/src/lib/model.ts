import type { Dataset, Factor } from "./data";

export type Profile = Partial<Record<Factor, string>>;

/** Inputs shown in the risk check, grouped the way a health worker would ask about them. */
export const GROUPS: { title: string; factors: Factor[] }[] = [
  { title: "The child", factors: ["age", "sex", "birth_size", "diarrhoea"] },
  { title: "The mother", factors: ["mother_education", "mother_height", "birth_interval", "insurance"] },
  { title: "The household", factors: ["wealth", "water", "toilet"] },
  { title: "Where they live", factors: ["province", "residence"] },
];
export const ALL_FACTORS = GROUPS.flatMap((g) => g.factors);

/** Levels that exist only to absorb missing data are not offered as inputs. */
const HIDDEN = new Set(["Not measured", "Not reported"]);

export function options(data: Dataset, f: Factor) {
  return data.model.order[f].filter((lv) => !HIDDEN.has(lv) && data.model.coefficients[f][lv]);
}

/** Factors a programme or family can realistically change, and the better level for each. */
export const MODIFIABLE: { factor: Factor; target: string; action: string }[] = [
  { factor: "birth_interval", target: "4 years or more", action: "Space the next birth 4+ years apart" },
  { factor: "insurance", target: "Yes", action: "Enrol the mother in health insurance" },
  { factor: "diarrhoea", target: "No", action: "Prevent and treat diarrhoea" },
  { factor: "water", target: "Improved source", action: "Use an improved drinking-water source" },
  { factor: "toilet", target: "Improved", action: "Use an improved toilet" },
];

export const PRESETS: { id: string; label: string; profile: Profile }[] = [
  {
    id: "rural-north",
    label: "Rural child, North",
    profile: {
      age: "12–23 months", sex: "Boy", birth_size: "Average or larger", diarrhoea: "Yes",
      mother_education: "Primary", mother_height: "150–154 cm", birth_interval: "Under 2 years", insurance: "No",
      wealth: "Poorest", water: "Unimproved source", toilet: "Unimproved or none", province: "North", residence: "Rural",
    },
  },
  {
    id: "urban-kigali",
    label: "Urban child, Kigali",
    profile: {
      age: "24–35 months", sex: "Girl", birth_size: "Average or larger", diarrhoea: "No",
      mother_education: "Secondary", mother_height: "155 cm or taller", birth_interval: "4 years or more",
      insurance: "Yes", wealth: "Richer", water: "Improved source", toilet: "Improved", province: "Kigali",
      residence: "Urban",
    },
  },
];

export function missing(profile: Profile) {
  return ALL_FACTORS.filter((f) => !profile[f]);
}

export function risk(data: Dataset, profile: Profile): number | null {
  if (missing(profile).length) return null;
  let z = data.model.intercept;
  for (const f of ALL_FACTORS) z += data.model.coefficients[f][profile[f]!]?.beta ?? 0;
  return 1 / (1 + Math.exp(-z));
}

/** Risk after applying each modifiable change on its own, then all together. */
export function whatIf(data: Dataset, profile: Profile) {
  const base = risk(data, profile);
  if (base === null) return null;
  const changes = MODIFIABLE.filter((m) => profile[m.factor] !== m.target && !(m.factor === "birth_interval" && profile.birth_interval === "First child"))
    .map((m) => ({ ...m, risk: risk(data, { ...profile, [m.factor]: m.target })! }))
    .map((c) => ({ ...c, delta: c.risk - base }))
    .sort((a, b) => a.delta - b.delta);
  const all = changes.reduce<Profile>((p, c) => ({ ...p, [c.factor]: c.target }), { ...profile });
  return { base, changes, combined: risk(data, all)! };
}
