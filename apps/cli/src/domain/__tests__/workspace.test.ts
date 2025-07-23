import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkWorkspaces, workspaceSchema } from "../workspace.js";
import { makeMockDependencies } from "./data.js";

describe("checkWorkspaces", () => {
  const monorepoDir = "/path/to/monorepo";
  const validWorkspaces = [
    workspaceSchema.parse({
      name: "workspace1",
      path: "/path/to/workspace1",
    }),
    workspaceSchema.parse({
      name: "workspace2",
      path: "/path/to/workspace2",
    }),
  ];

  it("should return the list of workspaces", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      ok(validWorkspaces),
    );

    const result = await checkWorkspaces(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        isValid: true,
        successMessage: "Found 2 workspaces",
      }),
    );
  });

  it("should return error when getWorkspaces fails", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      err(new Error("Failed to get workspaces")),
    );

    const result = await checkWorkspaces(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        errorMessage:
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        isValid: false,
      }),
    );
  });

  it("should return success when workspaces are found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      ok([validWorkspaces[0]]),
    );

    const result = await checkWorkspaces(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        isValid: true,
        successMessage: "Found 1 workspace",
      }),
    );
  });

  it("should return error when no workspace configuration is found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(ok([]));

    const result = await checkWorkspaces(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        errorMessage:
          "No workspace configuration found. Make sure to configure workspaces in pnpm-workspace.yaml.",
        isValid: false,
      }),
    );
  });
});
