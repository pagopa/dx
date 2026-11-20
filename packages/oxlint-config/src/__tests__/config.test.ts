import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BASE_CONFIG_PATH,
  BASE_JEST_CONFIG_PATH,
  CORE_CONFIG_PATH,
  loadConfig,
  type OxlintConfig,
  PACKAGE_ROOT,
  runOxlint,
} from "./support.ts";

const require = createRequire(import.meta.url);

const config = loadConfig(BASE_CONFIG_PATH);

const jestConfig = loadConfig(BASE_JEST_CONFIG_PATH);

const CLEAN_TYPESCRIPT =
  "const value = 1;\nexport const doubled = value * 2;\n";

const CLEAN_JEST = `import { describe, expect, it } from "@jest/globals";

describe("sum", () => {
  it("adds", () => {
    expect(1 + 1).toBe(2);
  });
});
`;

const FOCUSED_JEST = `import { expect, it } from "@jest/globals";

it.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`;

/**
 * Only `assertFunctionNames` makes this file pass: it has no `expect` call, so
 * on the plugin defaults it would be reported as a test without assertions.
 */
const ASSERT_ONLY_TEST = `import { it } from "@jest/globals";

const assert = (value) => {
  if (!value) {
    throw new Error("assertion failed");
  }
};

it("adds", () => {
  assert(1 + 1 === 2);
});
`;

const EXTENDED_TEST = `import { test as baseTest, expect } from "vitest";

const test = baseTest.extend<{ service: string }>({
  service: async (context, use) => {
    await use("service");
  },
});

test("uses the fixture", async ({ service }) => {
  expect(service).toBe("service");
});
`;

const STANDALONE_EXPECT = `import { expect } from "vitest";

expect(1).toBe(1);
`;

/** Vitest rules whose behaviour oxlint has no Jest counterpart for. */
const VITEST_ONLY_RULES = [
  "no-import-node-test",
  "prefer-called-exactly-once-with",
  "require-local-test-context-for-concurrent-snapshots",
];

const allRules = (source: OxlintConfig) => [
  ...Object.keys(source.rules),
  ...source.overrides.flatMap((override) => Object.keys(override.rules)),
];

const pluginOf = (rule: string) =>
  rule.includes("/") ? rule.slice(0, rule.indexOf("/")) : undefined;

/** The severity each rule ends up with, overrides included. */
const effectiveRules = (source: OxlintConfig) =>
  Object.assign(
    {},
    source.rules,
    ...source.overrides.map(({ rules }) => rules),
  );

const rulesOfPlugin = (source: OxlintConfig, plugin: string) =>
  Object.fromEntries(
    Object.entries(effectiveRules(source))
      .filter(([rule]) => pluginOf(rule) === plugin)
      .map(([rule, value]) => [rule.slice(plugin.length + 1), value]),
  );

interface ConsumerOptions {
  configPath?: string;
  files?: Record<string, string>;
  rules?: Record<string, unknown>;
}

/**
 * Lints files from a scratch directory whose `.oxlintrc.json` extends the
 * published config, the way a consumer project loads it.
 */
const lintAsConsumer = ({
  configPath = BASE_CONFIG_PATH,
  files = { "clean.ts": CLEAN_TYPESCRIPT },
  rules = {},
}: ConsumerOptions = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "oxlint-config-"));

  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(directory, name), contents);
    }
    writeFileSync(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({ extends: [configPath], rules }),
    );
    return runOxlint(directory, ["--format=json", ...Object.keys(files)]);
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
      rules: { "no-debugger-typo": "error" },
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
    const declared = new Set([
      ...config.plugins,
      ...config.jsPlugins.map(({ name }) => name),
    ]);

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
      override.files.includes("**/*.ts"),
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

describe("jest config", () => {
  it("lints a clean Jest file without findings", () => {
    const { status, stdout } = lintAsConsumer({
      configPath: BASE_JEST_CONFIG_PATH,
      files: { "clean.test.js": CLEAN_JEST },
    });

    expect(status).toBe(0);
    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
  });

  it("reports a finding through the Jest rules", () => {
    const { status, stdout } = lintAsConsumer({
      configPath: BASE_JEST_CONFIG_PATH,
      files: { "focused.test.js": FOCUSED_JEST },
    });

    expect(status).toBe(1);
    expect(stdout).toContain("jest(no-focused-tests)");
  });

  it("keeps the coverage of the base config and drops Vitest", () => {
    expect(jestConfig.categories).toEqual(config.categories);
    expect(jestConfig.rules).toEqual(config.rules);
    expect(jestConfig.plugins).not.toContain("vitest");
    expect(jestConfig.plugins).toContain("jest");
    expect(
      allRules(jestConfig).filter((rule) => pluginOf(rule) === "vitest"),
    ).toEqual([]);
  });

  it("applies its rules to the same test files as the base config", () => {
    const testOverride = (source: OxlintConfig) =>
      source.overrides.filter((override) =>
        Object.keys(override.rules).some((rule) =>
          /^(?:jest|vitest)\//u.test(rule),
        ),
      );

    expect(testOverride(config)).toHaveLength(1);
    expect(testOverride(jestConfig)).toHaveLength(1);
    expect(testOverride(jestConfig)[0]?.files).toEqual(
      testOverride(config)[0]?.files,
    );
    expect(testOverride(jestConfig)[0]?.rules).toMatchObject({
      "no-empty-function": "off",
    });
  });

  it("mirrors every Vitest rule oxlint ships as a Jest rule", () => {
    const vitestRules = rulesOfPlugin(config, "vitest");

    expect(Object.keys(vitestRules).length).toBeGreaterThan(0);
    expect(rulesOfPlugin(jestConfig, "jest")).toEqual(
      Object.fromEntries(
        Object.entries(vitestRules).filter(
          ([name]) => !VITEST_ONLY_RULES.includes(name),
        ),
      ),
    );
  });

  it("keeps the core rules in a config the variants share", () => {
    const core = loadConfig(CORE_CONFIG_PATH);

    expect(core.rules).toEqual(config.rules);
    expect(core.plugins).not.toContain("vitest");
    expect(core.plugins).not.toContain("jest");
    expect(
      allRules(core).filter((rule) => /^(?:jest|vitest)\//u.test(rule)),
    ).toEqual([]);
  });

  it("exposes base-jest.json through its own exports", () => {
    expect(require.resolve("@pagopa/oxlint-config/base-jest.json")).toBe(
      BASE_JEST_CONFIG_PATH,
    );
  });

  it("publishes every file the variants extend", () => {
    const { files } = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"),
    ) as { files: string[] };

    const shipped = [BASE_CONFIG_PATH, BASE_JEST_CONFIG_PATH];

    const extended = shipped.flatMap((path) => {
      const { extends: parents } = JSON.parse(readFileSync(path, "utf8")) as {
        extends?: string[];
      };

      return (parents ?? []).map((parent) => basename(parent));
    });

    const required = [...shipped, ...extended].map((path) => basename(path));

    expect([...files].sort()).toEqual([...new Set(required)].sort());
  });
});

// oxlint ignores rule options it does not recognise instead of rejecting the
// config, so a run is the only way to prove a payload reaches the linter. The
// Vitest default already accepts an `assert` helper, so only the Jest variant
// distinguishes a working payload from a dropped one.
describe("test-runner rule options", () => {
  it("reads assertFunctionNames from the Jest rules", () => {
    const { status, stdout } = lintAsConsumer({
      configPath: BASE_JEST_CONFIG_PATH,
      files: { "assert-only.test.js": ASSERT_ONLY_TEST },
    });

    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
    expect(status).toBe(0);
  });

  it("reads the blocks of a test that extends the runner", () => {
    const { status, stdout } = lintAsConsumer({
      configPath: BASE_CONFIG_PATH,
      files: {
        "fixture.test.ts": EXTENDED_TEST,
        "standalone.test.ts": STANDALONE_EXPECT,
      },
    });

    const { diagnostics } = JSON.parse(stdout) as {
      diagnostics: { code: string; filename: string }[];
    };

    expect(status).toBe(1);
    expect(
      diagnostics.map(({ code, filename }) => [basename(filename), code]),
    ).toEqual([["standalone.test.ts", "vitest(no-standalone-expect)"]]);
  });
});
