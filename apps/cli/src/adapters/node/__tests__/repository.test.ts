import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeRepositoryReader } from "../repository.js";

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
});
