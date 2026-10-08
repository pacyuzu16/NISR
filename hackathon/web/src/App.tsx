import { useEffect, useRef } from "react";
import { BookOpen, Calculator, ChartColumn, Compass, LoaderCircle, Map as MapIcon, Monitor, Moon, RefreshCw, Sun, TriangleAlert } from "lucide-react";
import { BrandMark, Empty, GitHubMark } from "./components/ui";
import { useDataset } from "./lib/data";
import { href, useRoute, type Page } from "./lib/router";
import { useTheme, type ThemePref } from "./lib/theme";
import { Districts } from "./pages/Districts";
import { Drivers } from "./pages/Drivers";
import { Methods } from "./pages/Methods";
import { Overview } from "./pages/Overview";
import { Risk } from "./pages/Risk";

const NAV: { page: Page; label: string; icon: typeof MapIcon }[] = [
  { page: "overview", label: "Overview", icon: Compass },
  { page: "districts", label: "Districts", icon: MapIcon },
  { page: "drivers", label: "Drivers", icon: ChartColumn },
  { page: "risk", label: "Risk check", icon: Calculator },
  { page: "methods", label: "Methods", icon: BookOpen },
];

const TITLES: Record<Page, string> = {
  overview: "Child stunting in Rwanda",
  districts: "Districts",
  drivers: "What drives stunting",
  risk: "Risk check",
  methods: "Methods",
};

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "Match system theme", icon: Monitor },
];

export default function App() {
  const route = useRoute();
  const { state, retry } = useDataset();
  const [theme, setTheme] = useTheme();
  const mainRef = useRef<HTMLElement>(null);
  const lastPage = useRef(route.page);

  useEffect(() => {
    document.title = `${TITLES[route.page]} · Gukura`;
    if (lastPage.current !== route.page) {
      lastPage.current = route.page;
      window.scrollTo({ top: 0 });
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [route.page]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <a className="brand" href={href("overview")} aria-label="Gukura, home">
            <BrandMark className="brand-mark" />
            <span className="brand-name">Gukura</span>
            <span className="brand-sub">Child growth in Rwanda</span>
          </a>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.page} href={href(n.page)} aria-current={route.page === n.page ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
              {THEMES.map((t) => (
                <button key={t.value} type="button" role="radio" aria-checked={theme === t.value} aria-label={t.label} title={t.label}
                  onClick={() => setTheme(t.value)}>
                  <t.icon size={15} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {state.status === "loading" && (
          <div className="state" role="status">
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-3)" }}>
              <LoaderCircle size={20} className="spinner" aria-hidden /> Loading survey results…
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div className="state">
            <div className="card" style={{ maxWidth: 440 }}>
              <Empty icon={<TriangleAlert size={20} />} title="The data didn't load">
                Check your connection and try again. ({state.message})
              </Empty>
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
                <button type="button" className="btn btn-primary" onClick={retry}>
                  <RefreshCw size={15} aria-hidden /> Try again
                </button>
              </div>
            </div>
          </div>
        )}
        {state.status === "ready" && (
          <div className="fade-in" key={route.page}>
            {route.notFound && (
              <div className="callout" role="alert" style={{ marginBottom: 24 }}>
                <TriangleAlert size={16} aria-hidden />
                <span>That page doesn't exist, so here's the overview instead.</span>
              </div>
            )}
            {route.page === "overview" && <Overview data={state.data} />}
            {route.page === "districts" && (
              <Districts
                data={state.data}
                geo={state.geo}
                selected={state.data.districts.some((d) => d.name === route.param) ? route.param : undefined}
              />
            )}
            {route.page === "drivers" && <Drivers data={state.data} />}
            {route.page === "risk" && (
              <Risk key={route.param ?? "default"} data={state.data} province={state.data.model.order.province.includes(route.param ?? "") ? route.param : undefined} />
            )}
            {route.page === "methods" && <Methods data={state.data} />}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>
            Data: NISR, MOH and ICF, Rwanda Demographic and Health Survey 2025. Built by Team NavySec for the NISR Big Data Hackathon 2026.
          </span>
          <span style={{ display: "inline-flex", gap: 16 }}>
            <a href={href("methods")}>Methods</a>
            <a href="https://github.com/pacyuzu16/NISR" target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <GitHubMark size={14} /> Source
            </a>
          </span>
        </div>
      </footer>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.page} href={href(n.page)} aria-current={route.page === n.page ? "page" : undefined}>
            <n.icon size={20} aria-hidden strokeWidth={route.page === n.page ? 2.25 : 1.75} />
            {n.label === "Risk check" ? "Risk" : n.label}
          </a>
        ))}
      </nav>
    </>
  );
}
