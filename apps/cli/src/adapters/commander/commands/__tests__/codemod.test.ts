/**
 * Tests for the `codemod` Commander command.
 *
 * Verifies that codemod subcommands emit through the shared CommandPresenter
 * port instead of writing directly to terminal/logging adapters.
 */

import { Command } from "commander";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Codemod } from "../../../../domain/codemod.js";
import type { ApplyCodemodById } from "../../../../use-cases/apply-codemod.js";
import type { ListCodemods } from "../../../../use-cases/list-codemods.js";

import { makeCodemodCommand } from "../codemod.js";

const codemods: Codemod[] = [
  {
    apply: vi.fn().mockResolvedValue(undefined),
    description: "Use pnpm",
    id: "use-pnpm",
  },
];

type CodemodCommandOverrides = {
  applyCodemodById?: ApplyCodemodById;
  listCodemods?: ListCodemods;
};

const makeSuccessfulApplyCodemodById = (): ApplyCodemodById =>
  vi.fn(() =>
    ResultAsync.fromPromise(Promise.resolve(), () => new Error("failed")),
  );

const runCodemodCommand = async (
  args: string[],
  overrides: CodemodCommandOverrides = {},
) => {
  const command = makeCodemodCommand({
    applyCodemodById:
      overrides.applyCodemodById ?? makeSuccessfulApplyCodemodById(),
    listCodemods: overrides.listCodemods ?? vi.fn(() => okAsync(codemods)),
  });
  const program = new Command()
    .exitOverride()
    .option("--output <mode>", "Output mode", "text")
    .addCommand(command);

  await program.parseAsync(["node", "dx", ...args]);
};

describe("makeCodemodCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("reports the codemod list through the json command presenter", async () => {
    const stdout: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
      stdout.push(String(data));
      return true;
    });

    await runCodemodCommand(["--output", "json", "codemod", "list"]);

    expect(JSON.parse(stdout.join(""))).toStrictEqual({
      data: [
        {
          description: "Use pnpm",
          id: "use-pnpm",
        },
      ],
      ok: true,
    });
  });

  it("reports the applied codemod through the json command presenter", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const applyCodemodById = vi.fn(() =>
      ResultAsync.fromPromise(Promise.resolve(), () => new Error("failed")),
    );
    vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
      stdout.push(String(data));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((data: unknown) => {
      stderr.push(String(data));
      return true;
    });

    await runCodemodCommand(
      ["--output", "json", "codemod", "apply", "use-pnpm"],
      {
        applyCodemodById,
      },
    );

    expect(applyCodemodById).toHaveBeenCalledWith("use-pnpm");
    expect(stderr.map((line) => JSON.parse(line))).toStrictEqual([
      {
        name: "Applying codemod use-pnpm...",
        status: "start",
        type: "step",
      },
      {
        name: "Applying codemod use-pnpm...",
        status: "success",
        type: "step",
      },
    ]);
    expect(JSON.parse(stdout.join(""))).toStrictEqual({
      data: {
        id: "use-pnpm",
      },
      ok: true,
    });
  });

  it("reports list errors through the json command presenter", async () => {
    const stdout: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
      stdout.push(String(data));
      return true;
    });

    await runCodemodCommand(["--output", "json", "codemod", "list"], {
      listCodemods: vi.fn(() => errAsync(new Error("registry failed"))),
    });

    expect(process.exitCode).toBe(1);
    expect(JSON.parse(stdout.join(""))).toStrictEqual({
      error: "registry failed",
      ok: false,
    });
  });
});
