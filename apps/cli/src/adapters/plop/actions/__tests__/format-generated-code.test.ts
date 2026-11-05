/**
 * The scaffold ends with a single formatting pass, delegated to the Nx tasks
 * of the target repository. These tests pin the commands the pass runs: the
 * workspace formatter and the `fmt` target of every project, which is how the
 * Nx Terraform plugin formats the generated Terraform modules.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const commands: string[] = [];
  const warnings: string[] = [];
  const recordCommand = (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): Promise<void> => {
    commands.push(
      strings.reduce(
        (fullCommand, string, index) =>
          `${fullCommand}${string}${values[index] ?? ""}`,
        "",
      ),
    );
    return Promise.resolve();
  };
  const execa$ = vi.fn(() => recordCommand);

  return { commands, execa$, recordCommand, warnings };
});

vi.mock("execa", () => ({ $: mocks.execa$ }));
vi.mock("@logtape/logtape", () => ({
  getLogger: () => ({
    warn: (_message: string, properties: { error: string }) => {
      mocks.warnings.push(properties.error);
    },
  }),
}));

import { formatGeneratedCode } from "../format-generated-code.js";

describe("formatGeneratedCode", () => {
  afterEach(() => {
    mocks.commands.length = 0;
    mocks.warnings.length = 0;
    mocks.execa$.mockReset();
    mocks.execa$.mockImplementation(() => mocks.recordCommand);
  });

  it("formats the whole repository, without filtering on the generated paths", async () => {
    await formatGeneratedCode();

    expect(mocks.commands).toEqual([
      "mise exec -- pnpm exec nx format:write --all",
      "mise exec -- pnpm exec nx run-many -t fmt",
    ]);
  });

  it("does not abort the generation when the formatting fails", async () => {
    mocks.execa$.mockReturnValue(() =>
      Promise.reject(new Error("mise: command not found")),
    );

    await expect(formatGeneratedCode()).resolves.toBeUndefined();
    expect(mocks.warnings).toEqual(["mise: command not found"]);
  });
});
