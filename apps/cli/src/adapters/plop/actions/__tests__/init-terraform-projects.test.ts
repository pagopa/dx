/**
 * The scaffold initializes the Terraform projects it generated or updated
 * through the Nx `init` target. These tests pin the project selection: only the
 * requested environments are initialized, so unrelated environments are never
 * touched by the generation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const commands: string[] = [];
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

  return { commands, execa$, recordCommand };
});

vi.mock("execa", () => ({ $: mocks.execa$ }));

import { initTerraformProjects } from "../init-terraform-projects.js";

describe("initTerraformProjects", () => {
  afterEach(() => {
    mocks.commands.length = 0;
    mocks.execa$.mockReset();
    mocks.execa$.mockImplementation(() => mocks.recordCommand);
  });

  it("initializes the projects tagged with the given environment", async () => {
    await initTerraformProjects(["ced-prod"]);

    expect(mocks.commands).toEqual([
      "mise exec -- pnpm exec nx run-many -t init --projects=tag:env:ced-prod",
    ]);
  });

  it("initializes the repository root project by name", async () => {
    await initTerraformProjects(["repository"]);

    expect(mocks.commands).toEqual([
      "mise exec -- pnpm exec nx run-many -t init --projects=repository",
    ]);
  });

  it("initializes every requested environment once", async () => {
    await initTerraformProjects(["dev", "ced-prod", "dev"]);

    expect(mocks.commands).toEqual([
      "mise exec -- pnpm exec nx run-many -t init --projects=tag:env:dev,tag:env:ced-prod",
    ]);
  });

  it("refuses to run without a project selection", async () => {
    await expect(initTerraformProjects([])).rejects.toThrow(
      "No Terraform project to initialize",
    );
    expect(mocks.execa$).not.toHaveBeenCalled();
  });

  it("propagates the failure of the init target", async () => {
    mocks.execa$.mockReturnValue(() =>
      Promise.reject(new Error("terraform init failed")),
    );

    await expect(initTerraformProjects(["repository"])).rejects.toThrow(
      "terraform init failed",
    );
  });
});
