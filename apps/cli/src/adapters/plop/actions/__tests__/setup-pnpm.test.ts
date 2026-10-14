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
  }[] = [];
  const execaOptions: { env?: NodeJS.ProcessEnv }[] = [];
  const savedNpmrcContent = { value: undefined as string | undefined };
  const execa$ = vi.fn((options: { env?: NodeJS.ProcessEnv } = {}) => {
    execaOptions.push(options);
    const userNpmrc = options.env?.npm_config_userconfig;
    if (
      typeof userNpmrc === "string" &&
      savedNpmrcContent.value === undefined
    ) {
      const nodeFs = process.getBuiltinModule("node:fs");
      try {
        savedNpmrcContent.value = nodeFs.readFileSync(userNpmrc, "utf8");
      } catch {
        savedNpmrcContent.value = undefined;
      }
    }
    return (
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ): Promise<void> => {
      const command = strings.reduce(
        (fullCommand, string, index) =>
          `${fullCommand}${string}${values[index] ?? ""}`,
        "",
      );
      commands.push(command);
      commandsWithEnvironment.push({ command, env: options.env });
      return Promise.resolve();
    };
  });

  return {
    commands,
    commandsWithEnvironment,
    execa$,
    execaOptions,
    savedNpmrcContent,
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
  const originalGitHubToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;

  beforeEach(() => {
    mocks.commands.length = 0;
    mocks.commandsWithEnvironment.length = 0;
    mocks.execaOptions.length = 0;
    mocks.savedNpmrcContent.value = undefined;
    mocks.execa$.mockClear();
    // Pin a token so the action never shells out to `gh auth token`.
    process.env.GITHUB_TOKEN = "test-github-token";
    delete process.env.GH_TOKEN;
  });

  afterEach(() => {
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

  const runGenerator = async () => {
    const plop = await nodePlop();
    setSetupPnpmAction(plop);
    plop.setGenerator("test", {
      actions: [{ type: "setupPnpm" }],
      prompts: [],
    });

    await plop.getGenerator("test").runActions({ repoName: "generated-repo" });
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

  it("authenticates to GitHub Packages through a temporary npmrc that never leaks the token", async () => {
    await runGenerator();

    const options = mocks.execaOptions.find(
      ({ env }) => env?.npm_config_userconfig !== undefined,
    );
    const userNpmrc = options?.env?.npm_config_userconfig;
    expect(userNpmrc).toEqual(expect.stringContaining("dx-npmrc-"));
    // The developer's own npmrc is copied, never used as the target file.
    expect(userNpmrc).not.toEqual(path.join(os.homedir(), ".npmrc"));
    expect(path.basename(path.dirname(userNpmrc ?? ""))).toMatch(/^dx-npmrc-/);
    expect(mocks.savedNpmrcContent.value).toContain(
      "//npm.pkg.github.com/:_authToken=test-github-token",
    );
    // The token is passed through the temporary npmrc, never as a CLI argument.
    expect(mocks.commands.join("\n")).not.toContain("test-github-token");
    // The temporary npmrc is removed once the bootstrap completes.
    await expect(fs.access(path.dirname(userNpmrc ?? ""))).rejects.toThrow();
  });

  it("passes the temporary npmrc only to the dependency commands", async () => {
    await runGenerator();

    const environmentFor = (command: string) =>
      mocks.commandsWithEnvironment.find((entry) => entry.command === command)
        ?.env;

    for (const command of [
      "mise lock",
      "mise install",
      "mise exec -- corepack use pnpm@11",
      "mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot",
      "mise exec -- pnpm exec oxfmt",
    ]) {
      expect(environmentFor(command)?.npm_config_userconfig).toBeUndefined();
    }

    for (const command of [
      `mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${NX_DOCKER_DEPENDENCY} ${OXFMT_DEPENDENCY}`,
      "mise exec -- pnpm install",
    ]) {
      expect(environmentFor(command)?.npm_config_userconfig).toEqual(
        expect.stringContaining("dx-npmrc-"),
      );
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
