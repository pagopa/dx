/**
 * Contract test for the `AGENTS.md` shipped by the monorepo generator: the
 * scaffolded file must name the toolchain and the pointers that the generated
 * repository actually provides.
 */
import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveTemplatesPath } from "../../../templates-path.js";
import { cleanupTempDir } from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_MONOREPO_GENERATOR_NAME } from "../index.js";

/** A toolchain entry and the generated config file that proves it exists. */
type ToolchainEntry = { readonly config: string; readonly name: string };

const TOOLCHAIN: readonly ToolchainEntry[] = [
  { config: "mise.toml", name: "mise" },
  { config: "pnpm-workspace.yaml", name: "pnpm" },
  { config: "nx.json", name: "Nx" },
  { config: "oxfmt.config.ts", name: "oxfmt" },
];

/** Stubs for the custom action types that call external services. */
const registerStubActions = (plop: NodePlopAPI) => {
  plop.setActionType("getNodeVersion", async (data) => {
    data.nodeVersion = "22.14.0";
    return "Fetched latest version: 22.14.0";
  });
  plop.setActionType("fetchGithubRelease", async (data, ctx) => {
    const resultKey = (ctx as Record<string, unknown>).resultKey as string;
    data[resultKey] = "1.11.0";
    return `Fetched latest version: 1.11.0`;
  });
  plop.setActionType("setupPnpm", async () => "Monorepo bootstrapped");
};

const payload: Payload = {
  ownership: {
    namespaceType: "Organization",
    owners: ["@pagopa/product-team"],
    reviewerTeams: ["product-team"],
  },
  repoDescription: "A test repository for DX",
  repoName: "my-test-repo",
  repoOwner: "pagopa",
};

describe("monorepo generator — AGENTS.md", () => {
  let tmpDir: string;
  let originalCwd: string;
  let agentsMd: string;

  const generatedFile = (filePath: string) =>
    path.join(tmpDir, payload.repoName, filePath);

  beforeAll(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-cli-monorepo-agents-md-test-"),
    );
    process.chdir(tmpDir);

    const plop = await nodePlop();
    registerStubActions(plop);
    plop.setGenerator(PLOP_MONOREPO_GENERATOR_NAME, {
      actions: getActions(resolveTemplatesPath("monorepo")),
      description: "A scaffold for a monorepo repository",
      prompts: [],
    });

    const generator = plop.getGenerator(PLOP_MONOREPO_GENERATOR_NAME);
    const result = await generator.runActions(payload);

    const realFailures = result.failures.filter(
      (f) => f.error !== "Aborted due to previous action failure",
    );
    if (realFailures.length > 0) {
      const summary = realFailures
        .map((f) => `${f.type}: ${f.error}`)
        .join("\n");
      throw new Error(`Generator failed:\n${summary}`);
    }

    agentsMd = await fs.readFile(generatedFile("AGENTS.md"), "utf8");
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("generates a non-empty AGENTS.md at the repository root", () => {
    expect(agentsMd.trim()).not.toBe("");
  });

  it("names the toolchain its own configuration files prove", async () => {
    for (const { config, name } of TOOLCHAIN) {
      await expect(fs.access(generatedFile(config))).resolves.toBeUndefined();
      expect(agentsMd).toContain(name);
    }
  });

  it("points at agent artifacts the generated repository ships", async () => {
    await expect(
      fs.access(generatedFile(".github/copilot/settings.json")),
    ).resolves.toBeUndefined();
    expect(agentsMd).toContain(".github/copilot/settings.json");
    // The scaffold ships no `.github/instructions/`: conventions reach the
    // agents through the plugins enabled in the Copilot settings.
    expect(agentsMd).not.toContain(".github/instructions/");
  });
});
