/**
 * Contract tests for the DX validation pipeline integration of the monorepo
 * generator: the scaffold must be ready for `validate-v2.yaml` and pass
 * `nx format:check` out of the box.
 */
import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
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
  repoDescription: "A test repository for DX",
  repoName: "my-test-repo",
  repoOwner: "pagopa",
};

describe("monorepo generator — DX validation pipeline", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-cli-monorepo-pipeline-test-"),
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
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("configures the Nx Terraform plugin for the DX validation pipeline", async () => {
    const generatedRoot = path.join(tmpDir, payload.repoName);
    const generatedFiles = await readGeneratedFiles(generatedRoot, ["nx.json"]);

    const nxJson = JSON.parse(generatedFiles["nx.json"]) as {
      plugins: Record<string, unknown>[];
    };
    expect(nxJson.plugins).toContainEqual(
      expect.objectContaining({
        include: ["infra/**"],
        plugin: "@pagopa/nx-terraform",
      }),
    );
    expect(nxJson.plugins).toContainEqual(
      expect.objectContaining({
        plugin: "@pagopa/nx-docker",
      }),
    );

    // DX packages flow through pnpm's built-in `gh:` alias: the scaffold must
    // not commit an npmrc that routes scopes or embeds secrets. The token is
    // written at bootstrap time to a git-ignored `.npmrc`.
    await expect(
      fs.access(path.join(generatedRoot, ".npmrc")),
    ).rejects.toThrow();
    await expect(
      fs.readFile(path.join(generatedRoot, ".gitignore"), "utf8"),
    ).resolves.toContain(".npmrc");
  });

  it("generates the Code Review workflow and the Trivy configuration", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      [
        ".github/workflows/validate.yaml",
        ".trivy/checks/terraform/forbid_azurerm_key_vault_secret_data_source.rego",
        "oxfmt.config.ts",
        "trivy.yml",
      ],
    );

    expect(generatedFiles[".github/workflows/validate.yaml"]).toContain(
      "uses: pagopa/dx/.github/workflows/validate-v2.yaml@main",
    );
    // Secrets are passed explicitly: `secrets: inherit` is limited to the
    // caller's own organization or enterprise, while the scaffold supports
    // repositories under any owner.
    expect(generatedFiles[".github/workflows/validate.yaml"]).toContain(
      "GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}",
    );
    expect(generatedFiles[".github/workflows/validate.yaml"]).not.toContain(
      "GH_APP_RELEASE_",
    );
    expect(generatedFiles[".github/workflows/validate.yaml"]).toContain(
      "ECR_PUBLIC_ROLE_ARN: ${{ secrets.ECR_PUBLIC_ROLE_ARN }}",
    );
    expect(generatedFiles[".github/workflows/validate.yaml"]).not.toContain(
      "secrets: inherit",
    );
    expect(generatedFiles["trivy.yml"]).toContain("ignorefile: .trivyignore");
    expect(generatedFiles["oxfmt.config.ts"]).toContain("defineConfig");
  });
});
