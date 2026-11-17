import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

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

const OXLINT_PACKAGE_ROOT = dirname(require.resolve("oxlint/package.json"));

export const OXLINT_SCHEMA_PATH = join(
  OXLINT_PACKAGE_ROOT,
  "configuration_schema.json",
);

export const loadBaseConfig = (): OxlintConfig =>
  JSON.parse(readFileSync(BASE_CONFIG_PATH, "utf8")) as OxlintConfig;

export const getOxlintRuleNames = (): Set<string> => {
  const schema = JSON.parse(readFileSync(OXLINT_SCHEMA_PATH, "utf8")) as {
    definitions?: { DummyRuleMap?: { properties?: Record<string, unknown> } };
  };
  return new Set(
    Object.keys(schema.definitions?.DummyRuleMap?.properties ?? {}),
  );
};
