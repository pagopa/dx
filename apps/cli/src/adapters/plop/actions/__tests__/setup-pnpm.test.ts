/**
 * Verifies the observable behavior of the monorepo bootstrap: the DX
 * dependencies are installed from the GitHub Packages registry, and the
 * scaffold is formatted once, at the end of the bootstrap.
 */
import nodePlop from "node-plop";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const commands: {
    command: string;
    env?: NodeJS.ProcessEnv;
    npmrcExistsAt: boolean;
  }[] = [];
  const execa$ = vi.fn(
    (options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) =>
      (
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
      ): Promise<void> => {
        const command = strings.reduce(
          (fullCommand, string, index) =>
            `${fullCommand}${string}${values[index] ?? ""}`,
          "",
        );
        const nodeFs = process.getBuiltinModule("node:fs");
        const nodePath = process.getBuiltinModule("node:path");
        commands.push({
          command,
          env: options.env,
          npmrcExistsAt: options.cwd
            ? nodeFs.existsSync(nodePath.join(options.cwd, ".npmrc"))
            : false,
        });
        return Promise.resolve();
      },
  );

  return { commands, execa$ };
});

vi.mock("execa", () => ({ $: mocks.execa$ }));

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import setSetupPnpmAction, {
  NX_DOCKER_DEPENDENCY,
  NX_TERRAFORM_DEPENDENCY,
  OXFMT_DEPENDENCY,
} from "../setup-pnpm.js";

describe("setupPnpm", () => {
  const originalCwd = process.cwd();
  const originalGitHubToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;
  let tmpDir: string;

  beforeEach(async () => {
    mocks.commands.length = 0;
    mocks.execa$.mockClear();
    // Pin a token so the action never shells out to `gh auth token`.
    process.env.GITHUB_TOKEN = "test-github-token";
    delete process.env.GH_TOKEN;
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dx-cli-setup-pnpm-"));
    process.chdir(tmpDir);
    // The generator renders the repository before this action runs.
    await fs.mkdir(path.join(tmpDir, "generated-repo"), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { force: true, recursive: true });
    if (originalGitHubToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalGitHubToken;
    }
    if (originalGhToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = originalGhToken;
    }
  });

  const repositoryNpmrc = () => path.join(tmpDir, "generated-repo", ".npmrc");

  const commandIndex = (expected: string) =>
    mocks.commands.findIndex(({ command }) => command === expected);

  const runGenerator = async () => {
    const plop = await nodePlop();
    setSetupPnpmAction(plop);
    plop.setGenerator("test", {
      actions: [{ type: "setupPnpm" }],
      prompts: [],
    });

    return await plop
      .getGenerator("test")
      .runActions({ repoName: "generated-repo" });
  };

  it("installs the DX dependencies from the GitHub Packages registry", async () => {
    await runGenerator();

    const dependenciesCommand = commandIndex(
      `mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${NX_DOCKER_DEPENDENCY} ${OXFMT_DEPENDENCY}`,
    );
    const installCommand = commandIndex("mise exec -- pnpm install");

    expect(dependenciesCommand).toBeGreaterThanOrEqual(0);
    expect(installCommand).toBeGreaterThan(dependenciesCommand);
    // The registry credentials must be in place before the first install.
    expect(mocks.commands[dependenciesCommand].npmrcExistsAt).toBe(true);
  });

  it("formats the scaffold once, after the dependencies are installed", async () => {
    await runGenerator();

    const installCommand = commandIndex("mise exec -- pnpm install");
    const formatCommand = commandIndex(
      "mise exec -- pnpm exec nx format:write --all",
    );
    const terraformFormatCommand = commandIndex(
      "mise exec -- pnpm exec nx run-many -t fmt",
    );

    expect(formatCommand).toBeGreaterThan(installCommand);
    // Formatting is delegated to the Nx tasks, not run directly.
    expect(terraformFormatCommand).toBeGreaterThan(formatCommand);
    expect(mocks.commands.at(-1)?.command).toBe(
      "mise exec -- pnpm exec nx run-many -t fmt",
    );
  });

  it("writes the GitHub Packages token to the repository npmrc", async () => {
    await runGenerator();

    await expect(fs.readFile(repositoryNpmrc(), "utf8")).resolves.toBe(
      "//npm.pkg.github.com/:_authToken=test-github-token\n",
    );
    // The token is written to the npmrc, never passed as a CLI argument.
    expect(
      mocks.commands.map(({ command }) => command).join("\n"),
    ).not.toContain("test-github-token");
    // Only the owner can read the credential.
    const { mode } = await fs.stat(repositoryNpmrc());
    expect(mode % 0o1000).toBe(0o600);
  });

  it("fails the bootstrap when the npmrc cannot be written", async () => {
    const writeFile = vi
      .spyOn(fs, "writeFile")
      .mockRejectedValueOnce(new Error("write failed"));

    try {
      const { failures } = await runGenerator();

      expect(failures).toEqual([
        expect.objectContaining({ error: "write failed" }),
      ]);
    } finally {
      writeFile.mockRestore();
    }
  });

  it("never forwards the raw GitHub token variables to the bootstrap commands", async () => {
    await runGenerator();

    for (const { env } of mocks.commands) {
      expect(env?.GITHUB_TOKEN).toBeUndefined();
      expect(env?.GH_TOKEN).toBeUndefined();
    }
  });
});
