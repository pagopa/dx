import { ESLint } from "eslint";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export interface Finding {
  column: number;
  line: number;
  rule: string;
}

export interface OxlintConfig {
  categories: Record<string, RuleValue>;
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
export const KNOWN_GAPS: readonly string[] = ["no-octal", "no-undef-init"];

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

/** Rules oxlint enforces on source files. */
export const getSourceRules = (config: OxlintConfig) =>
  toEnabledRules(config.rules);

/** Rules oxlint enforces on files matched by the test overrides. */
export const getTestRules = (config: OxlintConfig) => {
  const enabled = toEnabledRules(config.rules);
  for (const override of config.overrides) {
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

/**
 * ESLint resolves the schema defaults of every rule, so the option objects it
 * reports are a superset of the ones a config sets: only the values oxlint
 * pins have to agree, while the rest is left to the rule defaults.
 */
const matchesOptions = (actual: unknown, expected: unknown): boolean => {
  if (isPlainObject(actual)) {
    return (
      isPlainObject(expected) &&
      Object.keys(actual).every((key) =>
        matchesOptions(actual[key], expected[key]),
      )
    );
  }
  if (Array.isArray(actual)) {
    return (
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((item, index) => matchesOptions(item, expected[index]))
    );
  }
  return actual === expected;
};

/**
 * Options that oxlint cannot be configured with the same shape as ESLint.
 * Every entry scores a rule that is still checked for its other options.
 */
export const OPTION_DIVERGENCES: Readonly<Record<string, string>> = {
  radix:
    "ESLint relies on the rule default (always) that oxlint needs explicit",
};

/**
 * Every option `base.json` pins which `@pagopa/eslint-config` resolves to a
 * different value, as `<rule>: expected <eslint>, got <oxlint>`.
 */
export const findOptionMismatches = (
  oxlintRules: Map<string, Rule>,
  eslintRules: Map<string, Rule>,
) => {
  const mismatches: string[] = [];
  for (const [rule, { options }] of oxlintRules) {
    if (options.length === 0 || rule in OPTION_DIVERGENCES) {
      continue;
    }
    const candidate = toEslintCandidates(rule).find((id) =>
      eslintRules.has(id),
    );
    if (candidate === undefined) {
      continue;
    }
    const expected = eslintRules.get(candidate)?.options ?? [];
    if (!matchesOptions(options, expected)) {
      mismatches.push(
        `${rule}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(options)}`,
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
