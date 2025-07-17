import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PackageJson } from "../../../domain/package-json.js";
import { makeRepositoryReader } from "../repository.js";
import { makeMockPackageJson, makeMockPnpmWorkspaceYaml } from "./data.js";

async function* makeAsyncPaths(paths: string[]) {
  for (const path of paths) {
    await new Promise((resolve) => resolve(path));
    yield path;
  }
}

describe("makeRepositoryReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const repoRoot = "/some/repo/root";

  describe("getWorkspaces", () => {
    it("should return an error when pnpm-workspace.yaml does not exist", async () => {
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(
        new Error("No such file or directory"),
      );

      const repositoryReader = makeRepositoryReader();
      const result = await repositoryReader.getWorkspaces(repoRoot);

      expect(result).toStrictEqual(
        err(
          new Error("Failed to read file: /some/repo/root/pnpm-workspace.yaml"),
        ),
      );
    });
    it("should return an error when pnpm-workspace.yaml is malformed", async () => {
      vi.spyOn(fs, "readFile").mockResolvedValueOnce(
        "invalid: content: not a valid YAML",
      );

      const repositoryReader = makeRepositoryReader();
      const result = await repositoryReader.getWorkspaces(repoRoot);

      expect(result).toStrictEqual(err(new Error("Failed to parse YAML")));
    });

    it("should return no workspaces if the packages entry is not in the pnpm-workspace.yaml file", async () => {
      vi.spyOn(fs, "readFile").mockResolvedValueOnce("aValidYaml");
      vi.spyOn(fs, "glob");

      const repositoryReader = makeRepositoryReader();
      const result = await repositoryReader.getWorkspaces(repoRoot);

      expect(result).toStrictEqual(ok([]));
      expect(fs.readFile).nthCalledWith(
        1,
        "/some/repo/root/pnpm-workspace.yaml",
        "utf-8",
      );
      expect(fs.glob).toHaveBeenCalledTimes(0);
    });
  });

  it("should return the workspaces", async () => {
    vi.spyOn(fs, "readFile")
      // First read the pnpm-workspace.yaml file
      .mockResolvedValueOnce(makeMockPnpmWorkspaceYaml())
      // Then read the package.json files
      .mockResolvedValueOnce(
        JSON.stringify(
          makeMockPackageJson({ name: "foo" as PackageJson["name"] }),
        ),
      )
      .mockResolvedValueOnce(
        JSON.stringify(
          makeMockPackageJson({ name: "bar" as PackageJson["name"] }),
        ),
      );
    vi.spyOn(fs, "glob").mockImplementationOnce(() =>
      makeAsyncPaths(["packages/foo", "packages/bar"]),
    );

    const repositoryReader = makeRepositoryReader();
    const result = await repositoryReader.getWorkspaces(repoRoot);

    expect(result).toStrictEqual(
      ok([
        {
          name: "foo",
          path: "/some/repo/root/packages/foo",
        },
        {
          name: "bar",
          path: "/some/repo/root/packages/bar",
        },
      ]),
    );
    expect(fs.readFile).nthCalledWith(
      1,
      "/some/repo/root/pnpm-workspace.yaml",
      "utf-8",
    );
    expect(fs.glob).nthCalledWith(1, "packages/*", { cwd: repoRoot });
    expect(fs.readFile).nthCalledWith(
      2,
      "/some/repo/root/packages/foo/package.json",
      "utf-8",
    );
    expect(fs.readFile).nthCalledWith(
      3,
      "/some/repo/root/packages/bar/package.json",
      "utf-8",
    );
  });

  it("should return an error when the glob function fails", async () => {
    vi.spyOn(fs, "readFile")
      // First read the pnpm-workspace.yaml file
      .mockResolvedValueOnce(makeMockPnpmWorkspaceYaml());
    vi.spyOn(fs, "glob").mockImplementationOnce(() => ({
      async next() {
        throw new Error("glob failed");
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    }));

    const repositoryReader = makeRepositoryReader();
    const result = await repositoryReader.getWorkspaces(repoRoot);

    expect(result).toStrictEqual(
      err(new Error("Failed to resolve workspace glob: packages/*")),
    );
    expect(fs.readFile).nthCalledWith(
      1,
      "/some/repo/root/pnpm-workspace.yaml",
      "utf-8",
    );
    expect(fs.glob).nthCalledWith(1, "packages/*", { cwd: repoRoot });
  });
});
