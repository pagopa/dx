/**
 * Theme persistence and application.
 *
 * The palette itself lives in `globals.css` as CSS variables; this module only
 * decides which class the document carries and remembers the reader's choice.
 * The inline `themeScript` below runs before the first paint so the stored (or
 * system) theme is applied without a flash of the wrong colours.
 */

export type Theme = "dark" | "light";

/** localStorage key holding the reader's explicit choice, if any. */
export const themeStorageKey = "dx-metrics-theme";

/** Dark is the app's original identity and the fallback when nothing is stored. */
export const DEFAULT_THEME: Theme = "dark";

export const isTheme = (value: unknown): value is Theme =>
  value === "dark" || value === "light";

export const readStoredTheme = (): null | Theme => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(themeStorageKey);
    return isTheme(raw) ? raw : null;
  } catch {
    // Private mode or blocked storage: fall back to the system preference.
    return null;
  }
};

export const resolveSystemTheme = (): Theme => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

/** Reads the theme the pre-paint script already applied to <html>. */
export const readAppliedTheme = (): null | Theme => {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : null;
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const persistTheme = (theme: Theme) => {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Persisting is best-effort; the in-memory choice still applies.
  }
};

/**
 * Runs synchronously as the first child of <body>. Kept as a string so it is
 * inlined into the HTML and never waits on a bundle.
 */
export const themeScript = `(function(){try{var k=${JSON.stringify(themeStorageKey)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var e=document.documentElement;e.classList.remove("dark","light");e.classList.add(t);e.dataset.theme=t;e.style.colorScheme=t;}catch(e){}})();`;
