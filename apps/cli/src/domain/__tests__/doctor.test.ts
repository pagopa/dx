import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { runDoctor } from "../doctor.js";
import { workspaceSchema } from "../workspace.js";
import { makeMockConfig, makeMockDependencies } from "./data.js";

describe("runDoctor", () => {
  it("uses the provided repository path to find the repository root", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.findRepositoryRoot.mockReturnValueOnce(
      okAsync("a/repo/root"),
    );
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));

    await runDoctor(deps, makeMockConfig(), {
      repositoryPath: "apps/cli",
    });

    expect(deps.repositoryReader.findRepositoryRoot).toHaveBeenCalledWith(
      "apps/cli",
    );
  });

  it("runs every doctor check", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.findRepositoryRoot.mockReturnValueOnce(
      okAsync("a/repo/root"),
    );
    deps.repositoryReader.fileExists
      .mockReturnValueOnce(okAsync(true))
      .mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map([["nx", "^22.0.0"]])),
    );
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValue(new Map());
    deps.packageJsonReader.getScripts.mockReturnValue(okAsync(new Map()));
    deps.repositoryReader.getWorkspaces.mockReturnValue(
      okAsync([
        workspaceSchema.parse({
          name: "workspace",
          path: "packages/workspace",
        }),
      ]),
    );

    const result = await runDoctor(deps, makeMockConfig());

    expect(result.checks.map(({ checkName }) => checkName)).toEqual([
      "Pre-commit Configuration",
      "Nx Configuration",
      "Monorepo Scripts",
      "Workspaces",
    ]);
  });
});
