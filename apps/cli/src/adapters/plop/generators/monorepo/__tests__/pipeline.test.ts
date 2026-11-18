/**
 * Contract tests for the DX validation pipeline integration of the monorepo
 * generator: the scaffold must be ready for `validate-v2.yaml` and pass
 * `nx format:check` out of the box.
 */
import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
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
  ownership: {
    namespaceType: "Organization",
    owners: ["@pagopa/devex"],
    reviewerTeams: ["devex"],
  },
  repoDescription: "A test repository for DX",
  repoName: "my-test-repo",
  repoOwner: "pagopa",
};

const workspaceModule = createRequire(import.meta.url);

/** The Oxlint binary and preset shipped by the DX workspace, if resolvable. */
const resolveWorkspaceOxlint = () => ({
  bin: path.join(
    path.dirname(workspaceModule.resolve("oxlint/package.json")),
    "bin/oxlint",
  ),
  preset: path.dirname(
    workspaceModule.resolve("@pagopa/oxlint-config/base.json"),
  ),
});

/**
 * Lints a file of the generated repository with the workspace Oxlint binary,
 * so configuration discovery and ignore patterns resolve from the scaffold
 * root exactly as `nx lint` would inside a freshly generated repo.
 */
const lintGeneratedFile =
  (bin: string, generatedRoot: string) =>
  (file: string): Promise<{ output: string; status: null | number }> =>
    new Promise((resolve, reject) => {
      const child = spawn(bin, [file], { cwd: generatedRoot });

      let output = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        output += chunk;
      });
      child.on("close", (status) => {
        resolve({ output, status });
      });
      child.on("error", reject);
    });

/** Mirrors the `@pagopa/oxlint-config` package that `setup-pnpm` installs. */
const linkOxlintPreset = async (generatedRoot: string, preset: string) => {
  const scopeDir = path.join(generatedRoot, "node_modules/@pagopa");
  await fs.mkdir(scopeDir, { recursive: true });
  await fs.symlink(preset, path.join(scopeDir, "oxlint-config"), "dir");
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

  it("infers the lint target from the Oxlint plugin instead of ESLint", async () => {
    const generatedFiles = await readGeneratedFiles(
      path.join(tmpDir, payload.repoName),
      ["nx.json"],
    );

    const nxJson: unknown = JSON.parse(generatedFiles["nx.json"]);

    expect(nxJson).toMatchObject({
      plugins: expect.arrayContaining([
        expect.objectContaining({
          options: { targetName: "lint" },
          plugin: "@nx/oxlint",
        }),
      ]),
      // `--fix` is a CLI argument of the Oxlint executor: the target defaults
      // carry it for local runs and drop it in the read-only CI configuration.
      targetDefaults: {
        lint: expect.arrayContaining([
          expect.objectContaining({
            configurations: { ci: { args: "" } },
            dependsOn: ["^build"],
            filter: { plugin: "@nx/oxlint" },
            options: { args: "--fix" },
          }),
        ]),
      },
    });
    expect(generatedFiles["nx.json"]).not.toContain("@nx/eslint");
  });

  it("ships the Oxlint configuration and no Prettier artifact", async () => {
    const generatedRoot = path.join(tmpDir, payload.repoName);
    const generatedFiles = await readGeneratedFiles(generatedRoot, [
      ".gitignore",
      ".oxlintrc.json",
    ]);

    // The scaffold extends the published PagoPA DX preset, resolved from
    // GitHub Packages like the other DX packages. Oxlint only accepts file
    // paths in `extends`, so the preset is referenced through its install
    // path: a bare package specifier is rejected at lint time.
    const oxlintConfig = JSON.parse(generatedFiles[".oxlintrc.json"]);
    expect(oxlintConfig).toMatchObject({
      extends: ["./node_modules/@pagopa/oxlint-config/base.json"],
    });
    // The preset's own ignore list never matches consumer files, so the
    // scaffold carries the one that keeps `oxlint --fix` out of build output.
    expect(oxlintConfig.ignorePatterns).toEqual(
      expect.arrayContaining(["**/generated/*", "**/dist/**", "**/bin/**"]),
    );
    // Oxfmt replaced Prettier, so the scaffold ships no Prettier ignore file.
    await expect(
      fs.access(path.join(generatedRoot, ".prettierignore")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    // Oxlint has no cache, so neither the old nor a renamed cache entry ships.
    expect(generatedFiles[".gitignore"]).not.toContain(".eslintcache");
    expect(generatedFiles[".gitignore"]).not.toContain(".oxlintcache");
  });

  it("lints the generated sources with the Oxlint preset and the generated ignore list", async () => {
    const generatedRoot = path.join(tmpDir, payload.repoName);
    const { bin, preset } = resolveWorkspaceOxlint();
    await linkOxlintPreset(generatedRoot, preset);
    await fs.mkdir(path.join(generatedRoot, "dist"), { recursive: true });
    await fs.mkdir(path.join(generatedRoot, "src"), { recursive: true });

    // `@pagopa/oxlint-config` is only reachable through its install path, so
    // a wrong `extends` entry fails the whole run instead of being ignored.
    await fs.writeFile(
      path.join(generatedRoot, "src/sample.ts"),
      "export const isOne = (value: number) => value == 1;\n",
    );
    await fs.writeFile(
      path.join(generatedRoot, "dist/bundle.ts"),
      "export const broken = () => {\n  debugger;\n};\n",
    );

    // `eqeqeq` is not an Oxlint default rule: seeing it proves the scaffold
    // extends the DX preset rather than linting with the built-in set.
    const lintFile = lintGeneratedFile(bin, generatedRoot);
    const source = await lintFile("src/sample.ts");
    expect(source.output).toContain("eqeqeq");
    expect(source.status).toBe(1);

    // The preset ignore list never matches consumer files, so the generated
    // one is what keeps `oxlint --fix` out of build output: the file is
    // reported as not lintable instead of reporting its violation.
    const buildOutput = await lintFile("dist/bundle.ts");
    expect(buildOutput.output).not.toContain("no-debugger");
    expect(buildOutput.output).toContain("No files found to lint");
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
      "GH_APP_RELEASE",
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
