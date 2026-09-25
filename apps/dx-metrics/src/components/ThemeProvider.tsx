"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyTheme,
  DEFAULT_THEME,
  persistTheme,
  readAppliedTheme,
  readStoredTheme,
  resolveSystemTheme,
  type Theme,
} from "@/lib/theme";

interface ThemeContextValue {
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  setTheme: () => {},
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

/**
 * Shares the active colour theme with the toggle and the charts.
 *
 * The first render always reports `DEFAULT_THEME`, matching the server markup;
 * the theme actually applied by the pre-paint script is read in an effect so
 * hydration never disagrees with the server.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Intentionally applied after mount: the script already painted the right
    // theme, this only syncs React state so the toggle and charts agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(
      readAppliedTheme() ?? readStoredTheme() ?? resolveSystemTheme(),
    );
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ setTheme, theme, toggleTheme }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
