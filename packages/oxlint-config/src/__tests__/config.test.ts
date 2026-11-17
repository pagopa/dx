import perfectionist from "eslint-plugin-perfectionist";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  BASE_CONFIG_PATH,
  getOxlintRuleNames,
  loadBaseConfig,
  type OxlintConfig,
} from "./support.ts";

const require = createRequire(import.meta.url);

const config = loadBaseConfig();

const allRules = (source: OxlintConfig) => [
  ...Object.keys(source.rules),
  ...source.overrides.flatMap((override) => Object.keys(override.rules)),
];

const pluginOf = (rule: string) =>
  rule.includes("/") ? rule.slice(0, rule.indexOf("/")) : undefined;

const jsPluginNames = config.jsPlugins.map(({ name }) => name);

const perfectionistRules = new Set(Object.keys(perfectionist.rules ?? {}));

describe("base config", () => {
  it("declares only rules oxlint knows about", () => {
    const oxlintRules = getOxlintRuleNames();
    const unknown = allRules(config).filter((rule) => {
      const plugin = pluginOf(rule);
      if (plugin && jsPluginNames.includes(plugin)) {
        return !perfectionistRules.has(rule.slice(plugin.length + 1));
      }
      return !oxlintRules.has(rule);
    });

    expect(unknown).toEqual([]);
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
