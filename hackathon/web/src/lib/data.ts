import { useCallback, useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";

export type Estimate = { value: number; low: number; high: number; n: number };

export type Context = {
  poorest_two_quintiles: number;
  mother_secondary_plus: number;
  short_birth_interval: number;
  improved_toilet: number;
  insured: number;
};

export type District = {
  name: string;
  code: number;
  province: string;
  stunting: Estimate;
  severe: number;
  underweight: number;
  wasting: number;
  overweight: number;
  share_of_stunted: number;
  context: Context;
};

export type Coefficient = {
  beta: number;
  or: number;
  low: number;
  high: number;
  p: number | null;
  reference: boolean;
};

export type Factor =
  | "age" | "sex" | "wealth" | "mother_education" | "residence" | "mother_height" | "birth_interval"
  | "birth_size" | "water" | "toilet" | "diarrhoea" | "insurance" | "province";

export type Dataset = {
  meta: { generated: string; source: string; children_measured: number; children_in_model: number };
  national: {
    stunting: Estimate;
    severe: number;
    underweight: number;
    wasting: number;
    overweight: number;
    context: Context;
  };
  trend: { label: string; value: number }[];
  provinces: (Estimate & { name: string })[];
  age_curve: (Estimate & { from: number; to: number })[];
  districts: District[];
  gaps: Record<Factor, (Estimate & { level: string })[]>;
  model: {
    intercept: number;
    reference: Record<Factor, string>;
    order: Record<Factor, string[]>;
    coefficients: Record<Factor, Record<string, Coefficient>>;
    cv_auc: { logistic: number; gradient_boosting: number };
    calibration: { decile: number; predicted: number; observed: number }[];
    n: number;
  };
};

export type Geo = FeatureCollection<Geometry, { name: string }>;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dataset; geo: Geo };

const base = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export function useDataset() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getJson<Dataset>("data/gukura.json"), getJson<Geo>("data/districts.geojson")])
      .then(([data, geo]) => alive && setState({ status: "ready", data, geo }))
      .catch((e: unknown) =>
        alive && setState({ status: "error", message: e instanceof Error ? e.message : "Unknown error" }),
      );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  }, []);

  return { state, retry };
}

export const FACTOR_LABELS: Record<Factor, string> = {
  age: "Child's age",
  sex: "Child's sex",
  wealth: "Household wealth",
  mother_education: "Mother's education",
  residence: "Urban or rural",
  mother_height: "Mother's height",
  birth_interval: "Time since previous birth",
  birth_size: "Size at birth",
  water: "Drinking water",
  toilet: "Toilet facility",
  diarrhoea: "Diarrhoea in last 2 weeks",
  insurance: "Mother has health insurance",
  province: "Province",
};

export type Priority = "high" | "elevated" | "lower";

export function priorityOf(d: District, national: number): Priority {
  if (d.stunting.value >= 30 || d.severe >= 9) return "high";
  if (d.stunting.value >= national) return "elevated";
  return "lower";
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High priority",
  elevated: "Above national",
  lower: "Below national",
};
