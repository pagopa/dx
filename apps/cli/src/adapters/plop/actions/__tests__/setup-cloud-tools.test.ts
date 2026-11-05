/**
 * Verifies the mise commands used to add cloud tooling during environment setup.
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

import { setSetupCloudToolsAction } from "../setup-cloud-tools.js";

describe("setupCloudTools", () => {
  beforeEach(() => {
    mocks.commands.length = 0;
    mocks.execa$.mockClear();
  });

  it("uses a managed Python interpreter and allows Azure CLI prereleases", async () => {
    const plop = await nodePlop();
    setSetupCloudToolsAction(plop);
    plop.setGenerator("test", {
      actions: [{ type: "setupCloudTools" }],
      prompts: [],
    });

    await plop.getGenerator("test").runActions({});

    expect(mocks.commands).toEqual([
      'mise use aws-cli[symlink_bins=true]@2 python@3.14 uv@latest azure-cli[dependency_prereleases=allow,depends=["uv"]]@2',
    ]);
  });
});
