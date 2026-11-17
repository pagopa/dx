import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export interface LintResult {
  status: null | number;
  stderr: string;
  stdout: string;
}

export interface OxlintConfig {
  categories: Record<string, RuleValue>;
  ignorePatterns: string[];
  jsPlugins: { name: string; specifier: string }[];
  overrides: { files: string[]; rules: Record<string, RuleValue> }[];
  plugins: string[];
  rules: Record<string, RuleValue>;
}

export type RuleValue =
  | 0
  | 1
  | 2
  | "error"
  | "off"
  | "warn"
  | readonly [0 | 1 | 2 | "error" | "off" | "warn", ...unknown[]];

export const PACKAGE_ROOT = join(import.meta.dirname, "..", "..");

export const BASE_CONFIG_PATH = join(PACKAGE_ROOT, "base.json");

const OXLINT_BIN_PATH = join(
  dirname(require.resolve("oxlint/package.json")),
  "bin",
  "oxlint",
);

export const loadBaseConfig = (): OxlintConfig =>
  JSON.parse(readFileSync(BASE_CONFIG_PATH, "utf8")) as OxlintConfig;

export const runOxlint = (cwd: string, target: string): LintResult => {
  const { error, status, stderr, stdout } = spawnSync(
    OXLINT_BIN_PATH,
    [target],
    { cwd, encoding: "utf8" },
  );

  if (error) {
    throw error;
  }

  return { status, stderr, stdout };
};
