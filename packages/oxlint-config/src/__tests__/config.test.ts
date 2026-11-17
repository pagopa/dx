import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BASE_CONFIG_PATH,
  loadBaseConfig,
  type OxlintConfig,
  runOxlint,
} from "./support.ts";

const require = createRequire(import.meta.url);

const config = loadBaseConfig();

const CLEAN_TYPESCRIPT =
  "const value = 1;\nexport const doubled = value * 2;\n";

const allRules = (source: OxlintConfig) => [
  ...Object.keys(source.rules),
  ...source.overrides.flatMap((override) => Object.keys(override.rules)),
];

const pluginOf = (rule: string) =>
  rule.includes("/") ? rule.slice(0, rule.indexOf("/")) : undefined;

const jsPluginNames = config.jsPlugins.map(({ name }) => name);

/**
 * Lints a clean file from a scratch directory whose `.oxlintrc.json` extends
 * the published config, the way a consumer project loads it.
 */
const lintAsConsumer = (rules: Record<string, unknown> = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "oxlint-config-"));

  try {
    writeFileSync(join(directory, "clean.ts"), CLEAN_TYPESCRIPT);
    writeFileSync(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({ extends: [BASE_CONFIG_PATH], rules }),
    );
    return runOxlint(directory, ["--format=json", "clean.ts"]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};

describe("base config", () => {
  it("lints a clean TypeScript file without findings", () => {
    const { status, stdout } = lintAsConsumer();

    expect(status).toBe(0);
    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
  });

  it("fails on a rule oxlint does not know about", () => {
    const { status, stdout } = lintAsConsumer({
      "no-debugger-typo": "error",
    });

    expect(stdout).toContain("not found in plugin");
    expect(status).toBe(1);
  });

  it("registers the plugins its rules belong to", () => {
    const used = new Set(
      allRules(config)
        .map(pluginOf)
        .filter((plugin) => plugin !== undefined),
    );
    const declared = new Set([...config.plugins, ...jsPluginNames]);

    expect([...used].filter((plugin) => !declared.has(plugin))).toEqual([]);
    expect(
      config.plugins.filter(
        (plugin) => plugin !== "eslint" && !used.has(plugin),
      ),
    ).toEqual([]);
  });

  it("turns off every oxlint category", () => {
    expect(Object.entries(config.categories)).toHaveLength(7);
    expect(
      Object.entries(config.categories).filter(
        ([, severity]) => severity !== "off",
      ),
    ).toEqual([]);
  });

  it("turns off on TypeScript files the checks TypeScript already reports", () => {
    const typescriptOverride = config.overrides.find((override) =>
      override.files.every((file) => file.includes("ts")),
    );

    expect(typescriptOverride?.rules).toMatchObject({
      "no-const-assign": "off",
      "no-redeclare": "off",
      "no-unreachable": "off",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
    });
  });

  it("exposes base.json through its own exports", () => {
    expect(require.resolve("@pagopa/oxlint-config")).toBe(BASE_CONFIG_PATH);
    expect(require.resolve("@pagopa/oxlint-config/base.json")).toBe(
      BASE_CONFIG_PATH,
    );
  });
});
