/**
 * Verifies the commands used to bootstrap a generated monorepo.
 */
import nodePlop from "node-plop";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const commands: string[] = [];
  const execa$ = vi.fn(
    () =>
      (
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
      ): Promise<void> => {
        commands.push(
          strings.reduce(
            (command, string, index) =>
              `${command}${string}${values[index] ?? ""}`,
            "",
          ),
        );
        return Promise.resolve();
      },
  );

  return { commands, execa$ };
});

vi.mock("execa", () => ({ $: mocks.execa$ }));

import setSetupPnpmAction from "../setup-pnpm.js";

describe("setupPnpm", () => {
  beforeEach(() => {
    mocks.commands.length = 0;
    mocks.execa$.mockClear();
  });

  it("bootstraps Nx without installing or applying a devcontainer", async () => {
    const plop = await nodePlop();
    setSetupPnpmAction(plop);
    plop.setGenerator("test", {
      actions: [{ type: "setupPnpm" }],
      prompts: [],
    });

    await plop.getGenerator("test").runActions({ repoName: "generated-repo" });

    expect(mocks.commands).toEqual([
      "corepack use pnpm@10",
      "npx --yes nx@latest init --interactive=false --aiAgents=copilot",
      "pnpm -w add -D @nx/js @nx/eslint @nx/vitest",
    ]);
  });
});
