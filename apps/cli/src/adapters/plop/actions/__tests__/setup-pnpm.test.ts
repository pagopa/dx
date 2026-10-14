/**
 * Verifies the commands used to bootstrap a generated monorepo.
 */
import nodePlop from "node-plop";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const commands: string[] = [];
  const commandsWithEnvironment: {
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
        // Records whether the repository npmrc already exists when the
        // command runs, so ordering can be asserted.
        const nodeFs = process.getBuiltinModule("node:fs");
        const nodePath = process.getBuiltinModule("node:path");
        commands.push(command);
        commandsWithEnvironment.push({
          command,
          env: options.env,
          npmrcExistsAt: options.cwd
            ? nodeFs.existsSync(nodePath.join(options.cwd, ".npmrc"))
            : false,
        });
        return Promise.resolve();
      },
  );

  return {
    commands,
    commandsWithEnvironment,
    execa$,
  };
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
    mocks.commandsWithEnvironment.length = 0;
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

  it("bootstraps Nx without installing or applying a devcontainer", async () => {
    await runGenerator();

    expect(mocks.commands).toContain("mise exec -- corepack use pnpm@11");
    expect(mocks.commands).toContain(
      "mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot",
    );
    expect(mocks.commands).toContain(
      `mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${NX_DOCKER_DEPENDENCY} ${OXFMT_DEPENDENCY}`,
    );
    expect(mocks.commands).toContain("mise exec -- pnpm install");
    expect(mocks.commands).toContain("mise exec -- pnpm exec oxfmt");
    expect(mocks.commands).not.toEqual(
      expect.arrayContaining([expect.stringContaining("devcontainer")]),
    );
  });

  it("locks and installs mise tools before running the pnpm bootstrap", async () => {
    await runGenerator();

    const miseInstallIndex = mocks.commands.indexOf("mise install");
    const corepackIndex = mocks.commands.indexOf(
      "mise exec -- corepack use pnpm@11",
    );
    const miseLockIndex = mocks.commands.indexOf("mise lock");
    const nxInitIndex = mocks.commands.indexOf(
      "mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot",
    );
    const pnpmInstallIndex = mocks.commands.indexOf(
      "mise exec -- pnpm install",
    );
    const oxfmtIndex = mocks.commands.indexOf("mise exec -- pnpm exec oxfmt");

    expect(miseInstallIndex).toBeGreaterThanOrEqual(0);
    expect(miseLockIndex).toBeGreaterThanOrEqual(0);
    expect(miseLockIndex).toBeLessThan(miseInstallIndex);
    expect(corepackIndex).toBeGreaterThan(miseInstallIndex);
    expect(nxInitIndex).toBeGreaterThan(corepackIndex);
    expect(pnpmInstallIndex).toBeGreaterThan(miseInstallIndex);
    expect(oxfmtIndex).toBeGreaterThan(pnpmInstallIndex);
  });

  it("writes the GitHub Packages token to the repository npmrc", async () => {
    await runGenerator();

    await expect(fs.readFile(repositoryNpmrc(), "utf8")).resolves.toBe(
      "//npm.pkg.github.com/:_authToken=test-github-token\n",
    );
    // The token is written to the npmrc, never passed as a CLI argument.
    expect(mocks.commands.join("\n")).not.toContain("test-github-token");
    // Only the owner can read the credential.
    const { mode } = await fs.stat(repositoryNpmrc());
    expect(mode % 0o1000).toBe(0o600);
  });

  it("keeps the npmrc from the dependency commands onwards", async () => {
    await runGenerator();

    const npmrcExistsAt = (command: string) =>
      mocks.commandsWithEnvironment.find((entry) => entry.command === command)
        ?.npmrcExistsAt;

    for (const command of [
      "mise lock",
      "mise install",
      "mise exec -- corepack use pnpm@11",
      "mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot",
    ]) {
      expect(npmrcExistsAt(command)).toBe(false);
    }

    for (const command of [
      `mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${NX_DOCKER_DEPENDENCY} ${OXFMT_DEPENDENCY}`,
      "mise exec -- pnpm install",
      "mise exec -- pnpm exec oxfmt",
    ]) {
      expect(npmrcExistsAt(command)).toBe(true);
    }

    // The credential survives the bootstrap for the next local installs.
    await expect(fs.access(repositoryNpmrc())).resolves.toBeUndefined();
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

    for (const { env } of mocks.commandsWithEnvironment) {
      expect(env?.GITHUB_TOKEN).toBeUndefined();
      expect(env?.GH_TOKEN).toBeUndefined();
    }
  });
});
