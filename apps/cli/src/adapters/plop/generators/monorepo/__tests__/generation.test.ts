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
  shouldKeepTestArtifacts,
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
  let keepArtifacts: boolean;

  const payload: Payload = {
    repoDescription: "A test repository for DX",
    repoName: "my-test-repo",
    repoOwner: "pagopa",
  };

  beforeAll(async () => {
    originalCwd = process.cwd();
    keepArtifacts = shouldKeepTestArtifacts(process.env);
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
    await cleanupTempDir(tmpDir, keepArtifacts);
  });

  it("materializes repository metadata from the generator payload", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, "package.json"),
      "utf-8",
    );
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe(payload.repoName);
    expect(pkg.description).toBe(payload.repoDescription);
  });

  it("propagates action outputs into generated version files", async () => {
    const nodeVersion = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".node-version"),
      "utf-8",
    );
    const terraformVersion = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".terraform-version"),
      "utf-8",
    );
    const preCommitConfig = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".pre-commit-config.yaml"),
      "utf-8",
    );
    expect(nodeVersion.trim()).toBe("22.14.0");
    expect(terraformVersion.trim()).toBe("1.11.0");
    expect(preCommitConfig).toContain("rev: v1.11.0");
  });

  it("applies the repository-specific gitignore customization", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".gitignore"),
      "utf-8",
    );
    expect(content).toContain("**/modules/**/.terraform.lock.hcl");
    expect(content).toContain("**/_modules/**/.terraform.lock.hcl");
  });
});
