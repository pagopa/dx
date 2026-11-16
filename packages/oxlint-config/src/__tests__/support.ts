import { ESLint } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, matchesGlob } from "node:path";

const require = createRequire(import.meta.url);

export interface Finding {
  column: number;
  line: number;
  rule: string;
}

export interface OxlintConfig {
  categories: Record<string, RuleValue>;
  ignorePatterns: string[];
  jsPlugins: { name: string; specifier: string }[];
  overrides: { files: string[]; rules: Record<string, RuleValue> }[];
  plugins: string[];
  rules: Record<string, RuleValue>;
}

export interface Rule {
  options: readonly unknown[];
  severity: RuleSeverity;
}

export type RuleSeverity = "error" | "off" | "warn";

type RuleValue =
  | 0
  | 1
  | 2
  | readonly [0 | 1 | 2 | RuleSeverity, ...unknown[]]
  | RuleSeverity;

/**
 * Rules of `@pagopa/eslint-config` that oxlint cannot express. Keeping this
 * list exhaustive is what makes the parity test fail when a new ESLint rule is
 * added without an oxlint counterpart.
 */
export const KNOWN_GAPS: readonly string[] = [
  "no-dupe-args",
  "no-octal",
  "no-undef-init",
];

/**
 * Rules `@pagopa/eslint-config` enables on plain JavaScript files that oxlint
 * ships only in its nursery category, which this config keeps disabled.
 */
export const NURSERY_GAPS: readonly string[] = ["no-undef"];

/** Paths the parity cases use to sample each kind of file. */
export const SCRIPT_SAMPLE_PATH = "src/example.js";

export const SOURCE_SAMPLE_PATH = "src/example.ts";

export const TEST_SAMPLE_PATH = "src/example.test.ts";

export const PACKAGE_ROOT = join(import.meta.dirname, "..", "..");

export const BASE_CONFIG_PATH = join(PACKAGE_ROOT, "base.json");

const OXLINT_PACKAGE_ROOT = dirname(require.resolve("oxlint/package.json"));

export const OXLINT_BIN_PATH = join(OXLINT_PACKAGE_ROOT, "bin", "oxlint");

export const OXLINT_SCHEMA_PATH = join(
  OXLINT_PACKAGE_ROOT,
  "configuration_schema.json",
);

const TYPESCRIPT_PLUGIN = "typescript/";

const TYPESCRIPT_SCOPE = "@typescript-eslint/";

export const loadBaseConfig = (): OxlintConfig =>
  JSON.parse(readFileSync(BASE_CONFIG_PATH, "utf8")) as OxlintConfig;

const normalizeSeverity = (value: RuleValue): RuleSeverity => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "error" || raw === 2) {
    return "error";
  }
  if (raw === "warn" || raw === 1) {
    return "warn";
  }
  return "off";
};

const toOptions = (value: RuleValue): readonly unknown[] =>
  typeof value === "string" || typeof value === "number"
    ? []
    : [...value].slice(1);

const toEnabledRules = (rules: Record<string, RuleValue>) => {
  const enabled = new Map<string, Rule>();
  for (const [rule, value] of Object.entries(rules)) {
    const severity = normalizeSeverity(value);
    if (severity !== "off") {
      enabled.set(rule, { options: toOptions(value), severity });
    }
  }
  return enabled;
};

/** Rules oxlint enforces on `relativePath`, with overrides applied in order. */
export const getRulesFor = (config: OxlintConfig, relativePath: string) => {
  const enabled = toEnabledRules(config.rules);
  for (const override of config.overrides) {
    if (!override.files.some((file) => matchesGlob(relativePath, file))) {
      continue;
    }
    for (const [rule, value] of Object.entries(override.rules)) {
      const severity = normalizeSeverity(value);
      if (severity === "off") {
        enabled.delete(rule);
      } else {
        enabled.set(rule, { options: toOptions(value), severity });
      }
    }
  }
  return enabled;
};

/** Rules oxlint enforces on plain JavaScript files. */
export const getScriptRules = (config: OxlintConfig) =>
  getRulesFor(config, SCRIPT_SAMPLE_PATH);

/** Rules oxlint enforces on TypeScript files. */
export const getSourceRules = (config: OxlintConfig) =>
  getRulesFor(config, SOURCE_SAMPLE_PATH);

/** Rules oxlint enforces on TypeScript test files. */
export const getTestRules = (config: OxlintConfig) =>
  getRulesFor(config, TEST_SAMPLE_PATH);

let eslint: ESLint | undefined;

/**
 * Rules `@pagopa/eslint-config` enables for `relativePath`, resolved through
 * the ESLint API so that presets and plugin recommendations are accounted for.
 */
export const getEslintRules = async (relativePath: string) => {
  eslint ??= new ESLint({
    cwd: PACKAGE_ROOT,
    overrideConfigFile: require.resolve("@pagopa/eslint-config"),
  });
  const { rules } = await eslint.calculateConfigForFile(relativePath);
  return toEnabledRules(rules as Record<string, RuleValue>);
};

/** oxlint rule ids that can implement the given ESLint rule, best match first. */
export const toOxlintCandidates = (eslintRuleId: string): string[] => {
  if (!eslintRuleId.startsWith(TYPESCRIPT_SCOPE)) {
    return [eslintRuleId];
  }
  const name = eslintRuleId.slice(TYPESCRIPT_SCOPE.length);
  return [`${TYPESCRIPT_PLUGIN}${name}`, name];
};

/** ESLint rule ids that the given oxlint rule can stand for. */
export const toEslintCandidates = (oxlintRuleId: string): string[] => {
  if (oxlintRuleId.startsWith(TYPESCRIPT_PLUGIN)) {
    return [
      `${TYPESCRIPT_SCOPE}${oxlintRuleId.slice(TYPESCRIPT_PLUGIN.length)}`,
    ];
  }
  if (oxlintRuleId.includes("/")) {
    return [oxlintRuleId];
  }
  return [oxlintRuleId, `${TYPESCRIPT_SCOPE}${oxlintRuleId}`];
};

export const findSeverityMatch = (
  rules: Map<string, Rule>,
  candidates: string[],
  severity: RuleSeverity,
) =>
  candidates.find((candidate) => rules.get(candidate)?.severity === severity);

/** Canonical ESLint rule id for a rule id reported by oxlint. */
export const toCanonicalRuleId = (
  oxlintRuleId: string,
  eslintRules: Map<string, Rule>,
) =>
  toEslintCandidates(oxlintRuleId).find((candidate) =>
    eslintRules.has(candidate),
  );

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepEqual = (actual: unknown, expected: unknown): boolean => {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((item, index) => deepEqual(item, expected[index]))
    );
  }
  if (isPlainObject(actual) || isPlainObject(expected)) {
    if (!isPlainObject(actual) || !isPlainObject(expected)) {
      return false;
    }
    const keys = Object.keys(actual);
    return (
      keys.length === Object.keys(expected).length &&
      keys.every(
        (key) => key in expected && deepEqual(actual[key], expected[key]),
      )
    );
  }
  return actual === expected;
};

/**
 * Removes every value that equals the schema default in the same position, so
 * that what a config pins can be compared with the options ESLint reports
 * after merging those defaults. Keys and items without a default are kept.
 */
const withoutDefaults = (value: unknown, fallback: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      withoutDefaults(
        item,
        Array.isArray(fallback) ? fallback[index] : undefined,
      ),
    );
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const defaults = isPlainObject(fallback) ? fallback : {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, item]) => !(key in defaults && deepEqual(item, defaults[key])),
      )
      .map(([key, item]) => [key, withoutDefaults(item, defaults[key])]),
  );
};

const isEmptyOption = (value: unknown) =>
  (isPlainObject(value) && Object.keys(value).length === 0) ||
  (Array.isArray(value) && value.length === 0);

/**
 * Options a config pins explicitly: entries that only repeat the rule defaults
 * are dropped from both sides, so a config that sets the severity alone and a
 * config that spells the defaults out compare as equal, while a value only one
 * side pins is kept and reported.
 */
const toPinnedOptions = (
  options: readonly unknown[],
  defaults: readonly unknown[],
) => {
  const pinned = options.map((option, index) =>
    withoutDefaults(option, defaults[index]),
  );
  const isDefaultOnly = (index: number) =>
    deepEqual(options[index], defaults[index]) ||
    (index < defaults.length && isEmptyOption(pinned[index]));
  let end = pinned.length;
  while (end > 0 && isDefaultOnly(end - 1)) {
    end -= 1;
  }
  return pinned.slice(0, end);
};

interface FlatConfigEntry {
  plugins?: Record<string, { rules?: Record<string, RuleDefinition> }>;
}

interface RuleDefinition {
  meta?: unknown;
}

const readDefaults = (meta: unknown): readonly unknown[] => {
  if (!isPlainObject(meta)) {
    return [];
  }
  const { defaultOptions } = meta as { defaultOptions?: unknown };
  return Array.isArray(defaultOptions) ? defaultOptions : [];
};

const collectRuleDefaults = () => {
  const defaults = new Map<string, readonly unknown[]>();
  // `builtinRules` is the only entry point ESLint offers for core rule
  // metadata: the `Linter` class does not expose the rule registry.
  for (const [rule, { meta }] of builtinRules) {
    defaults.set(rule, readDefaults(meta));
  }
  // Plugin rules are not part of `builtinRules`, so they are read from the
  // flat config objects of @pagopa/eslint-config. `perfectionist/*`, `vitest/*`
  // and most `typescript/*` rules do not declare `meta.defaultOptions` because
  // their defaults are applied by the rule itself: ESLint resolves none for
  // them either, so an empty list is accurate instead of a silent skip. If one
  // of them starts reporting defaults, the mismatch surfaces rather than
  // passing unnoticed.
  const exported: unknown = require("@pagopa/eslint-config");
  const entries =
    isPlainObject(exported) && "default" in exported
      ? exported["default"]
      : exported;
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    const { plugins = {} } = (entry ?? {}) as FlatConfigEntry;
    for (const [plugin, definition] of Object.entries(plugins)) {
      for (const [rule, ruleDefinition] of Object.entries(
        definition?.rules ?? {},
      )) {
        defaults.set(`${plugin}/${rule}`, readDefaults(ruleDefinition?.meta));
      }
    }
  }
  return defaults;
};

let ruleDefaults: Map<string, readonly unknown[]> | undefined;

/** Schema defaults ESLint merges into the options of every rule. */
const getRuleDefaults = () => {
  ruleDefaults ??= collectRuleDefaults();
  return ruleDefaults;
};

/**
 * Options that oxlint cannot be configured with the same shape as ESLint.
 * Every entry excuses the option mismatch only: severity parity and coverage
 * are still enforced for the rule.
 */
export const OPTION_DIVERGENCES: Readonly<Record<string, string>> = {
  radix:
    "ESLint relies on the rule default (always) that oxlint needs explicit",
};

/**
 * Effective options that `base.json` and `@pagopa/eslint-config` do not agree
 * on, as `<rule>: expected <eslint>, got <oxlint>`. Defaults are removed from
 * both sides, so an option pinned by one config and omitted by the other is
 * reported in either direction.
 */
export const findOptionMismatches = (
  oxlintRules: Map<string, Rule>,
  eslintRules: Map<string, Rule>,
) => {
  const defaults = getRuleDefaults();
  const mismatches: string[] = [];
  for (const [rule, { options }] of oxlintRules) {
    if (rule in OPTION_DIVERGENCES) {
      continue;
    }
    const candidate = toEslintCandidates(rule).find((id) =>
      eslintRules.has(id),
    );
    if (candidate === undefined) {
      continue;
    }
    const ruleDefaultsForRule = defaults.get(candidate) ?? [];
    const expected = toPinnedOptions(
      eslintRules.get(candidate)?.options ?? [],
      ruleDefaultsForRule,
    );
    const actual = toPinnedOptions(options, ruleDefaultsForRule);
    if (!deepEqual(actual, expected)) {
      mismatches.push(
        `${rule}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
  }
  return mismatches.sort();
};

export const getOxlintRuleNames = (): Set<string> => {
  const schema = JSON.parse(readFileSync(OXLINT_SCHEMA_PATH, "utf8")) as {
    definitions?: { DummyRuleMap?: { properties?: Record<string, unknown> } };
  };
  return new Set(
    Object.keys(schema.definitions?.DummyRuleMap?.properties ?? {}),
  );
};

/** oxlint reports rule ids as `plugin(rule)`, core rules included. */
const toOxlintRuleId = (code: string) => {
  const match = /^(?<plugin>.+)\((?<rule>.*)\)$/.exec(code);
  const { plugin = "", rule = code } = match?.groups ?? {};
  return plugin === "eslint" ? rule : `${plugin}/${rule}`;
};

export const runOxlint = (cwd: string, target: string): Finding[] => {
  const result = spawnSync(
    OXLINT_BIN_PATH,
    ["--config", join(cwd, ".oxlintrc.json"), "--format", "json", target],
    { cwd, encoding: "utf8" },
  );

  if (result.error) {
    throw result.error;
  }
  if (!result.stdout.trim()) {
    throw new Error(`oxlint produced no output: ${result.stderr}`);
  }

  const { diagnostics = [] } = JSON.parse(result.stdout) as {
    diagnostics?: {
      code: string;
      labels: { span: { column: number; line: number } }[];
    }[];
  };

  return diagnostics.map(({ code, labels }) => ({
    column: labels[0]?.span.column ?? 0,
    line: labels[0]?.span.line ?? 0,
    rule: toOxlintRuleId(code),
  }));
};

export const runEslint = async (cwd: string, filePath: string) => {
  const instance = new ESLint({
    cwd,
    overrideConfigFile: require.resolve("@pagopa/eslint-config"),
  });
  const [result] = await instance.lintText(readFileSync(filePath, "utf8"), {
    filePath,
  });
  return result?.messages.map(({ column, line, ruleId }) => ({
    column,
    line,
    rule: ruleId ?? "",
  }));
};
