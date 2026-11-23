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

export const BASE_JEST_CONFIG_PATH = join(PACKAGE_ROOT, "base-jest.json");

export const BASE_MODULE_PATH = join(PACKAGE_ROOT, "base.js");

export const BASE_JEST_MODULE_PATH = join(PACKAGE_ROOT, "base-jest.js");

export const CORE_CONFIG_PATH = join(PACKAGE_ROOT, "core.json");

const OXLINT_BIN_PATH = join(
  dirname(require.resolve("oxlint/package.json")),
  "bin",
  "oxlint",
);

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/**
 * Reads a config the way oxlint does: `extends` holds paths relative to the
 * file that declares them, and the merge is additive, so a child config can
 * only add plugins, rules and overrides.
 */
export const loadConfig = (path: string): OxlintConfig => {
  const raw = JSON.parse(
    readFileSync(path, "utf8"),
  ) as Partial<OxlintConfig> & {
    extends?: string[];
  };
  const parents = (raw.extends ?? []).map((parent) =>
    loadConfig(join(dirname(path), parent)),
  );

  return {
    categories: Object.assign(
      {},
      ...parents.map((parent) => parent.categories),
      raw.categories,
    ),
    ignorePatterns: [
      ...parents.flatMap((parent) => parent.ignorePatterns),
      ...(raw.ignorePatterns ?? []),
    ],
    jsPlugins: [
      ...parents.flatMap((parent) => parent.jsPlugins),
      ...(raw.jsPlugins ?? []),
    ],
    overrides: [
      ...parents.flatMap((parent) => parent.overrides),
      ...(raw.overrides ?? []),
    ],
    plugins: unique([
      ...parents.flatMap((parent) => parent.plugins),
      ...(raw.plugins ?? []),
    ]),
    rules: Object.assign(
      {},
      ...parents.map((parent) => parent.rules),
      raw.rules,
    ),
  };
};

// A single thread keeps the run cheap, because the tests of a project run in
// parallel with the tasks of the other projects on the same CI runner.
export const runOxlint = (cwd: string, args: string[]): LintResult => {
  const { error, status, stderr, stdout } = spawnSync(
    OXLINT_BIN_PATH,
    ["--threads=1", ...args],
    { cwd, encoding: "utf8" },
  );

  if (error) {
    throw error;
  }

  return { status, stderr, stdout };
};
