import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BASE_CONFIG_PATH,
  BASE_JEST_CONFIG_PATH,
  BASE_JEST_MODULE_PATH,
  BASE_MODULE_PATH,
  CORE_CONFIG_PATH,
  loadConfig,
  type OxlintConfig,
  PACKAGE_ROOT,
  runOxlint,
} from "./support.ts";

const require = createRequire(import.meta.url);

const config = await loadConfig(BASE_CONFIG_PATH);

const jestConfig = await loadConfig(BASE_JEST_CONFIG_PATH);

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

const UNSORTED_OBJECT = "export const pair = {\n  b: 2,\n  a: 1,\n};\n";

const PARSE_INT_WITHOUT_RADIX = 'export const parsed = parseInt("42");\n';

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
const lintAsConsumer = async ({
  configPath = BASE_CONFIG_PATH,
  files = { "clean.ts": CLEAN_TYPESCRIPT },
  rules = {},
}: ConsumerOptions = {}) => {
  const directory = await mkdtemp(join(tmpdir(), "oxlint-config-"));

  try {
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(join(directory, name), contents);
    }
    await writeFile(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({ extends: [configPath], rules }),
    );
    return await runOxlint(directory, ["--format=json", ...Object.keys(files)]);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

interface ModuleConsumerOptions {
  config?: string;
  files?: Record<string, string>;
  subpath?: string;
}

/**
 * Lints files from a scratch directory whose `oxlint.config.ts` imports the
 * package subpath, the way a TypeScript consumer config loads it.
 */
const lintAsModuleConsumer = async ({
  subpath = "@pagopa/oxlint-config/base",
  config = `import preset from "${subpath}";\n\nexport default preset;\n`,
  files = { "clean.ts": CLEAN_TYPESCRIPT },
}: ModuleConsumerOptions = {}) => {
  const directory = await mkdtemp(join(tmpdir(), "oxlint-config-module-"));

  try {
    await mkdir(join(directory, "node_modules", "@pagopa"), {
      recursive: true,
    });
    await symlink(
      PACKAGE_ROOT,
      join(directory, "node_modules", "@pagopa", "oxlint-config"),
      "dir",
    );
    await writeFile(join(directory, "oxlint.config.ts"), config);
    for (const [name, contents] of Object.entries(files)) {
      await mkdir(dirname(join(directory, name)), { recursive: true });
      await writeFile(join(directory, name), contents);
    }
    return await runOxlint(directory, ["--format=json", ...Object.keys(files)]);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

interface ComposedConfig {
  extends: ConfigLayer[];
}

/** One of the layers a module entry hands to oxlint. */
type ConfigLayer = Partial<OxlintConfig>;

const loadModule = async (path: string): Promise<ComposedConfig> => {
  const module: { default: ComposedConfig } = await import(
    pathToFileURL(path).href
  );

  return module.default;
};

describe("base config", () => {
  it("lints a clean TypeScript file without findings", async () => {
    const { status, stdout } = await lintAsConsumer();

    expect(status).toBe(0);
    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
  });

  it("fails on a rule oxlint does not know about", async () => {
    const { status, stdout } = await lintAsConsumer({
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
  it("lints a clean Jest file without findings", async () => {
    const { status, stdout } = await lintAsConsumer({
      configPath: BASE_JEST_CONFIG_PATH,
      files: { "clean.test.js": CLEAN_JEST },
    });

    expect(status).toBe(0);
    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
  });

  it("reports a finding through the Jest rules", async () => {
    const { status, stdout } = await lintAsConsumer({
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

  it("keeps the core rules in a config the variants share", async () => {
    const core = await loadConfig(CORE_CONFIG_PATH);

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

  it("publishes every file the variants are made of", async () => {
    const { files } = JSON.parse(
      await readFile(join(PACKAGE_ROOT, "package.json"), "utf8"),
    ) as { files: string[] };

    const shipped = [BASE_CONFIG_PATH, BASE_JEST_CONFIG_PATH];

    const extended = (
      await Promise.all(
        shipped.map(async (path) => {
          const { extends: parents } = JSON.parse(
            await readFile(path, "utf8"),
          ) as {
            extends?: string[];
          };

          return (parents ?? []).map((parent) => basename(parent));
        }),
      )
    ).flat();

    const modules = [
      BASE_MODULE_PATH,
      BASE_JEST_MODULE_PATH,
      join(PACKAGE_ROOT, "base.d.ts"),
      join(PACKAGE_ROOT, "base-jest.d.ts"),
      join(PACKAGE_ROOT, "compose.js"),
    ];

    const required = [...shipped, ...extended, ...modules].map((path) =>
      basename(path),
    );

    expect([...files].sort()).toEqual([...new Set(required)].sort());
  });
});

describe("module entries", () => {
  it("exposes the variants through their own exports", () => {
    expect(require.resolve("@pagopa/oxlint-config/base")).toBe(
      BASE_MODULE_PATH,
    );
    expect(require.resolve("@pagopa/oxlint-config/base-jest")).toBe(
      BASE_JEST_MODULE_PATH,
    );
  });

  it("nests core.json and the overlay instead of merging them", async () => {
    const core = await loadConfig(CORE_CONFIG_PATH);
    const variant = JSON.parse(
      await readFile(BASE_CONFIG_PATH, "utf8"),
    ) as OxlintConfig;
    const [coreLayer, variantLayer] = (await loadModule(BASE_MODULE_PATH))
      .extends;

    expect(coreLayer?.rules).toEqual(core.rules);
    expect(coreLayer?.categories).toEqual(core.categories);
    expect(coreLayer?.plugins).toEqual(core.plugins);
    expect(coreLayer?.ignorePatterns).toEqual(core.ignorePatterns);
    expect(variantLayer).toEqual({
      overrides: variant.overrides,
      plugins: variant.plugins,
    });
  });

  it("leaves out the keys only the declaring file can resolve", async () => {
    const [coreLayer, variantLayer] = (await loadModule(BASE_MODULE_PATH))
      .extends;

    expect(Object.keys(coreLayer ?? {}).sort()).toEqual([
      "categories",
      "ignorePatterns",
      "jsPlugins",
      "overrides",
      "plugins",
      "rules",
    ]);
    expect(Object.keys(variantLayer ?? {}).sort()).toEqual([
      "overrides",
      "plugins",
    ]);
  });

  it("anchors the plugin specifiers so consumer hoisting does not matter", async () => {
    const [coreLayer] = (await loadModule(BASE_MODULE_PATH)).extends;

    expect(coreLayer?.jsPlugins?.map(({ name }) => name)).toEqual(
      config.jsPlugins.map(({ name }) => name),
    );
    expect(
      coreLayer?.jsPlugins?.every(({ specifier }) => isAbsolute(specifier)),
    ).toBe(true);
  });

  it("keeps the core ignorePatterns out of the consumer workspace", async () => {
    const { status, stdout } = await lintAsModuleConsumer({
      files: { "dist/generated.ts": UNSORTED_OBJECT },
    });

    expect(status).toBe(1);
    expect(stdout).toContain("perfectionist(sort-objects)");
  });

  it("lints a clean TypeScript file without findings", async () => {
    const { status, stdout } = await lintAsModuleConsumer();

    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
    expect(status).toBe(0);
  });

  it("resolves the plugin dependency from the package", async () => {
    const { status, stdout } = await lintAsModuleConsumer({
      files: { "unsorted.ts": UNSORTED_OBJECT },
    });

    expect(status).toBe(1);
    expect(stdout).toContain("perfectionist(sort-objects)");
  });

  it("lints a consumer that extends the preset and overrides a rule", async () => {
    const { status, stdout } = await lintAsModuleConsumer({
      config: `import preset from "@pagopa/oxlint-config/base";

export default {
  extends: [preset],
  ignorePatterns: ["**/dist/**"],
  rules: { radix: "off" },
};
`,
      files: {
        "dist/generated.ts": UNSORTED_OBJECT,
        "radix.ts": PARSE_INT_WITHOUT_RADIX,
        "unsorted.ts": UNSORTED_OBJECT,
      },
    });

    const { diagnostics } = JSON.parse(stdout) as {
      diagnostics: { code: string; filename: string }[];
    };

    expect(status).toBe(1);
    expect(
      diagnostics.map(({ code, filename }) => [basename(filename), code]),
    ).toEqual([["unsorted.ts", "perfectionist(sort-objects)"]]);
  });

  it("applies the Jest flavour of the same file", async () => {
    const { status, stdout } = await lintAsModuleConsumer({
      files: { "focused.test.js": FOCUSED_JEST },
      subpath: "@pagopa/oxlint-config/base-jest",
    });

    expect(status).toBe(1);
    expect(stdout).toContain("jest(no-focused-tests)");
  });
});

// oxlint ignores rule options it does not recognise instead of rejecting the
// config, so a run is the only way to prove a payload reaches the linter. The
// Vitest default already accepts an `assert` helper, so only the Jest variant
// distinguishes a working payload from a dropped one.
describe("test-runner rule options", () => {
  it("reads assertFunctionNames from the Jest rules", async () => {
    const { status, stdout } = await lintAsConsumer({
      configPath: BASE_JEST_CONFIG_PATH,
      files: { "assert-only.test.js": ASSERT_ONLY_TEST },
    });

    expect(
      (JSON.parse(stdout) as { diagnostics: unknown[] }).diagnostics,
    ).toEqual([]);
    expect(status).toBe(0);
  });

  it("reads the blocks of a test that extends the runner", async () => {
    const { status, stdout } = await lintAsConsumer({
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
