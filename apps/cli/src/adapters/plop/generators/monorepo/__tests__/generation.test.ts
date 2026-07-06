import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
/**
 * Contract tests for the monorepo generator.
 *
 * They generate a real repository in a temp directory, but they only
 * assert the generator-specific contract: payload interpolation,
 * injected action outputs, and post-processing we own. They
 * intentionally avoid asserting generic Plop copy/render behavior.
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveTemplatesPath } from "../../../templates-path.js";
import {
  cleanupTempDir,
  readGeneratedFiles,
} from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_MONOREPO_GENERATOR_NAME } from "../index.js";

/**
 * Register stub versions of the custom action types that would normally
 * call external services (GitHub API, Node.js releases, shell commands).
 */
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

describe("monorepo generator — file generation", () => {
  let tmpDir: string;
  let originalCwd: string;

  const payload: Payload = {
    repoDescription: "A test repository for DX",
    repoName: "my-test-repo",
    repoOwner: "pagopa",
  };

  beforeAll(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dx-cli-monorepo-test-"));
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
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("materializes repository metadata from the generator payload", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      ["package.json"],
    );

    expect(generatedFiles).toMatchSnapshot();
  });

  it("propagates action outputs into generated version files", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      [".node-version", ".terraform-version", ".pre-commit-config.yaml"],
    );

    expect(generatedFiles).toMatchSnapshot();
  });

  it("does not add pnpm 11 build approval settings to the generated pnpm workspace", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      ["pnpm-workspace.yaml"],
    );

    expect(generatedFiles["pnpm-workspace.yaml"]).not.toContain("allowBuilds:");
  });

  it("applies the repository-specific gitignore customization", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      [".gitignore"],
    );

    expect(generatedFiles).toMatchSnapshot();
  });

  it("does not enable the aiepfd plugin in generated Copilot settings", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      [".github/copilot/settings.json"],
    );

    const settings = JSON.parse(
      generatedFiles[".github/copilot/settings.json"],
    );

    expect(settings.enabledPlugins).not.toHaveProperty("aiepfd@pagopa-dx");
  });
});
