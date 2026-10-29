/** Darstellung: Tag (Standard), Nacht oder nach Gerät. Gilt je Browser. */
export type Theme = "tag" | "nacht" | "auto";

const KEY = "jotunland.theme";
const dark = window.matchMedia("(prefers-color-scheme: dark)");

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "nacht" || t === "auto" ? t : "tag";
  } catch {
    return "tag";
  }
}

export function applyTheme(t: Theme = readTheme()) {
  document.documentElement.dataset.theme = t === "nacht" || (t === "auto" && dark.matches) ? "dark" : "light";
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* gilt dann nur bis zum Neuladen */
  }
  applyTheme(t);
}

dark.addEventListener("change", () => applyTheme());
