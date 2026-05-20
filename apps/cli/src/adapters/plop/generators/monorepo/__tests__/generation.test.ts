import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
/**
 * Integration tests for the monorepo generator's file generation logic.
 *
 * These tests exercise the full Plop pipeline (template compilation +
 * file writing) in an isolated temp directory. External service calls
 * (GitHub releases, Node.js version API, shell commands) are stubbed
 * by registering no-op action types directly on the Plop instance,
 * bypassing the real action registration functions.
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

  it("creates the output directory named after repoName", async () => {
    const repoDir = path.join(tmpDir, payload.repoName);
    const stat = await fs.stat(repoDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it("generates package.json with interpolated repo name and description", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, "package.json"),
      "utf-8",
    );
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe(payload.repoName);
    expect(pkg.description).toBe(payload.repoDescription);
  });

  it("generates .node-version with the mocked Node.js version", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".node-version"),
      "utf-8",
    );
    expect(content.trim()).toBe("22.14.0");
  });

  it("generates .terraform-version with the mocked Terraform version", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".terraform-version"),
      "utf-8",
    );
    expect(content.trim()).toBe("1.11.0");
  });

  it("generates .pre-commit-config.yaml with the mocked version", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".pre-commit-config.yaml"),
      "utf-8",
    );
    expect(content).toContain("rev: v1.11.0");
  });

  it("generates README.md with repo name and description", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, "README.md"),
      "utf-8",
    );
    expect(content).toContain(`# ${payload.repoName}`);
    expect(content).toContain(payload.repoDescription);
  });

  it("generates infra/repository/main.tf with repo name", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, "infra", "repository", "main.tf"),
      "utf-8",
    );
    expect(content).toContain(payload.repoName);
    expect(content).toContain(payload.repoDescription);
  });

  it("appends terraform lock file exclusions to .gitignore", async () => {
    const content = await fs.readFile(
      path.join(tmpDir, payload.repoName, ".gitignore"),
      "utf-8",
    );
    expect(content).toContain("**/modules/**/.terraform.lock.hcl");
    expect(content).toContain("**/_modules/**/.terraform.lock.hcl");
  });

  it("generates static config files (nx.json, pnpm-workspace.yaml)", async () => {
    const repoDir = path.join(tmpDir, payload.repoName);
    const nxJson = await fs.stat(path.join(repoDir, "nx.json"));
    expect(nxJson.isFile()).toBe(true);

    const pnpmWorkspace = await fs.stat(
      path.join(repoDir, "pnpm-workspace.yaml"),
    );
    expect(pnpmWorkspace.isFile()).toBe(true);
  });

  it("generates dot files (.editorconfig, .prettierignore)", async () => {
    const repoDir = path.join(tmpDir, payload.repoName);
    const editorconfig = await fs.stat(path.join(repoDir, ".editorconfig"));
    expect(editorconfig.isFile()).toBe(true);

    const prettierignore = await fs.stat(path.join(repoDir, ".prettierignore"));
    expect(prettierignore.isFile()).toBe(true);
  });
});
