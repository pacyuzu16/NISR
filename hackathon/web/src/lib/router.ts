import { useEffect, useState } from "react";

export type Page = "overview" | "districts" | "drivers" | "risk" | "methods";
export const PAGES: Page[] = ["overview", "districts", "drivers", "risk", "methods"];

export type Route = { page: Page; param?: string; notFound?: boolean };

function parse(hash: string): Route {
  const [, seg = "", param] = hash.replace(/^#/, "").split("/");
  if (seg === "") return { page: "overview" };
  if ((PAGES as string[]).includes(seg)) {
    return { page: seg as Page, param: param ? decodeURIComponent(param) : undefined };
  }
  return { page: "overview", notFound: true };
}

export function href(page: Page, param?: string) {
  if (page === "overview") return "#/";
  return `#/${page}${param ? `/${encodeURIComponent(param)}` : ""}`;
}

/** Hash routing keeps the app deployable as static files (GitHub Pages) with shareable deep links. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/** Update the param without adding a history entry for every click. */
export function replaceParam(page: Page, param?: string) {
  const next = href(page, param);
  if (window.location.hash !== next) window.history.replaceState(null, "", next);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
