import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

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

export interface Diagnostic {
  code: string;
  filename: string;
  message: string;
}

export interface ProjectLintResult extends LintResult {
  diagnostics: Diagnostic[];
}

const parseDiagnostics = (stdout: string): Diagnostic[] => {
  try {
    return (
      (JSON.parse(stdout) as { diagnostics?: Diagnostic[] }).diagnostics ?? []
    );
  } catch {
    return [];
  }
};

interface ProjectOptions {
  configPath: string;
  files: Record<string, string>;
}

/**
 * Lints a scratch tree that mirrors the repository layout, so `ignorePatterns`,
 * per-directory overrides and inherited rules are exercised the way the
 * workspace relies on them. The scratch `.oxlintrc.json` keeps the entries of
 * the given config and only re-anchors its `extends` to absolute paths, because
 * oxlint resolves ignore patterns against the directory holding the config.
 */
export const lintProject = ({
  configPath,
  files,
}: ProjectOptions): ProjectLintResult => {
  const directory = mkdtempSync(join(tmpdir(), "oxlint-project-"));

  try {
    for (const [name, contents] of Object.entries(files)) {
      const path = join(directory, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents);
    }

    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      extends?: string[];
    };
    writeFileSync(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({
        ...config,
        extends: (config.extends ?? []).map((path) =>
          resolve(dirname(configPath), path),
        ),
      }),
    );

    const result = runOxlint(directory, ["--format=json", "."]);

    return {
      ...result,
      diagnostics: parseDiagnostics(result.stdout),
    };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};
