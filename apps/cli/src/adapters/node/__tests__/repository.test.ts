import * as glob from "glob";
import { fs, vol } from "memfs";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PackageJson } from "../../../domain/package-json.js";
import { makeRepositoryReader } from "../repository.js";
import { makeMockPackageJson, makeMockPnpmWorkspaceYaml } from "./data.js";

vi.mock("node:fs/promises");

const mockFileSystem = {
  "./packages/bar/package.json": JSON.stringify(
    makeMockPackageJson({ name: "bar" as PackageJson["name"] }),
  ),
  "./packages/foo/package.json": JSON.stringify(
    makeMockPackageJson({ name: "foo" as PackageJson["name"] }),
  ),
  "./pnpm-workspace.yaml": makeMockPnpmWorkspaceYaml(),
};

describe("makeRepositoryReader", () => {
  const repoRoot = "/some/repo/root";
  vi.mock("glob", { spy: true });
  beforeEach(() => {
    vi.clearAllMocks();
    vol.reset();
    vol.fromJSON(mockFileSystem, repoRoot);
  });

  describe("getWorkspaces", () => {
    it("should return an error when pnpm-workspace.yaml does not exist", async () => {
      vol.reset();

      const repositoryReader = makeRepositoryReader();
      const result = await repositoryReader.getWorkspaces(repoRoot);

      expect(result).toStrictEqual(
        err(
          new Error("Failed to read file: /some/repo/root/pnpm-workspace.yaml"),
        ),
      );
    });

    it("should return no workspaces if the packages entry is not in the pnpm-workspace.yaml file", async () => {
      vol.reset();
      vol.fromJSON(
        { ...mockFileSystem, "./pnpm-workspace.yaml": "a yaml" },
        repoRoot,
      );
      const readFileSpy = vi.spyOn(fs.promises, "readFile");
      const globSpy = vi.spyOn(glob, "glob");

      const repositoryReader = makeRepositoryReader();
      const result = await repositoryReader.getWorkspaces(repoRoot);

      expect(result).toStrictEqual(ok([]));
      expect(readFileSpy).nthCalledWith(
        1,
        "/some/repo/root/pnpm-workspace.yaml",
        "utf-8",
      );
      expect(globSpy).not.toHaveBeenCalled();
    });
  });

  it("should return the workspaces", async () => {
    const spyReadFile = vi.spyOn(fs.promises, "readFile");
    const globSpy = vi.spyOn(glob, "glob");
    globSpy.mockResolvedValueOnce(["packages/foo", "packages/bar"]);

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
    expect(spyReadFile).nthCalledWith(
      1,
      "/some/repo/root/pnpm-workspace.yaml",
      "utf-8",
    );
    expect(globSpy).toHaveBeenCalledTimes(1);
    expect(globSpy).toHaveBeenCalledWith("packages/*", {
      cwd: repoRoot,
    });
    expect(spyReadFile).nthCalledWith(
      2,
      "/some/repo/root/packages/foo/package.json",
      "utf-8",
    );
    expect(spyReadFile).nthCalledWith(
      3,
      "/some/repo/root/packages/bar/package.json",
      "utf-8",
    );
  });

  it("should return an error when the glob function fails", async () => {
    const readFileSpy = vi.spyOn(fs.promises, "readFile");
    const globSpy = vi.spyOn(glob, "glob");
    // First read the pnpm-workspace.yaml file
    globSpy.mockImplementationOnce(() =>
      Promise.reject(new Error("glob failed")),
    );

    const repositoryReader = makeRepositoryReader();
    const result = await repositoryReader.getWorkspaces(repoRoot);

    expect(result).toStrictEqual(
      err(new Error("Failed to resolve workspace glob: packages/*")),
    );
    expect(readFileSpy).toBeCalledWith(
      "/some/repo/root/pnpm-workspace.yaml",
      "utf-8",
    );
    expect(globSpy).toBeCalledWith("packages/*", {
      cwd: repoRoot,
    });
  });
});
