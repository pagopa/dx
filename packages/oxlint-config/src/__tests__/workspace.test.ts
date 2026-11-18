import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lintProject, PACKAGE_ROOT } from "./support.ts";

/** The config the repository itself is linted with. */
const WORKSPACE_CONFIG_PATH = join(PACKAGE_ROOT, "..", "..", ".oxlintrc.json");

/** Only the entries of the config under test, without the inherited ones. */
interface WorkspaceConfig {
  ignorePatterns?: string[];
}

const workspaceConfig = JSON.parse(
  readFileSync(WORKSPACE_CONFIG_PATH, "utf8"),
) as WorkspaceConfig;

const TYPE_ALIAS = `type Payload = { id: string };

export const payload: Payload = { id: "1" };
`;

/**
 * A path the given glob matches, so the samples follow the config instead of
 * restating the layout of the repository the config describes.
 */
const sampleOf = (pattern: string) =>
  `${pattern.replaceAll("**", "sample").replaceAll("*", "sample")}.ts`;

describe("workspace config", () => {
  it("lints the sources through the rules the config extends", () => {
    const { diagnostics } = lintProject({
      configPath: WORKSPACE_CONFIG_PATH,
      files: { "src/payload.ts": TYPE_ALIAS },
    });

    expect(diagnostics.map(({ code }) => code)).toEqual([
      "typescript(consistent-type-definitions)",
    ]);
  });

  it("honours every ignore pattern the config declares", () => {
    const ignored = (workspaceConfig.ignorePatterns ?? []).map(sampleOf);

    const { diagnostics } = lintProject({
      configPath: WORKSPACE_CONFIG_PATH,
      files: Object.fromEntries([
        ["src/payload.ts", TYPE_ALIAS] as const,
        ...ignored.map((path) => [path, TYPE_ALIAS] as const),
      ]),
    });

    expect(ignored.length).toBeGreaterThan(0);
    expect(diagnostics.map(({ filename }) => filename)).toEqual([
      "src/payload.ts",
    ]);
  });
});
