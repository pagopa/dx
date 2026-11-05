"use client";

import { useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/lib/theme";

/**
 * Chart palettes.
 *
 * Series hues are primitives: a chart picks a key by meaning and the value can
 * be retuned in one place. The dark values are the app's original palette; the
 * light values are their Primer counterparts, chosen so every series keeps
 * enough contrast against the light card surface.
 */
export const SERIES_COLORS: Record<Theme, Record<SeriesKey, string>> = {
  dark: {
    amber: "#d29922",
    blue: "#1f6feb",
    brightGreen: "#39d353",
    gray: "#8b949e",
    green: "#238636",
    lightBlue: "#58a6ff",
    purple: "#a371f7",
    red: "#f85149",
  },
  light: {
    amber: "#bf8700",
    blue: "#0969da",
    brightGreen: "#2da44e",
    gray: "#6e7781",
    green: "#1a7f37",
    lightBlue: "#218bff",
    purple: "#8250df",
    red: "#cf222e",
  },
};

export type SeriesKey =
  | "amber"
  | "blue"
  | "brightGreen"
  | "gray"
  | "green"
  | "lightBlue"
  | "purple"
  | "red";

/** Chrome colours (grid, axes, tooltip) for the Recharts surfaces. */
interface ChartChrome {
  axis: string;
  grid: string;
  legend: string;
  tick: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
}

const CHART_CHROME: Record<Theme, ChartChrome> = {
  dark: {
    axis: "#30363d",
    grid: "#21262d",
    legend: "#8b949e",
    tick: "#8b949e",
    tooltipBackground: "#161b22",
    tooltipBorder: "#30363d",
    tooltipText: "#e6edf3",
  },
  light: {
    axis: "#d0d7de",
    grid: "#eaeef2",
    legend: "#57606a",
    tick: "#57606a",
    tooltipBackground: "#ffffff",
    tooltipBorder: "#d0d7de",
    tooltipText: "#1f2328",
  },
};

/**
 * Categorical palette for part-to-whole charts. Deliberately excludes the
 * semantic green/red used by severity, so a slice colour never implies a
 * good/bad judgement on the category it represents.
 */
export const PIE_ORDER: readonly SeriesKey[] = [
  "blue",
  "purple",
  "amber",
  "lightBlue",
  "gray",
  "brightGreen",
];

/** Default assignment order for multi-series charts. */
export const SERIES_ORDER: readonly SeriesKey[] = [
  "green",
  "gray",
  "blue",
  "amber",
  "purple",
  "brightGreen",
  "lightBlue",
  "red",
];

export const useSeriesColors = (): Record<SeriesKey, string> => {
  const { theme } = useTheme();
  return SERIES_COLORS[theme];
};

export const useChartChrome = (): ChartChrome => {
  const { theme } = useTheme();
  return CHART_CHROME[theme];
};
