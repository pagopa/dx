import { err } from "neverthrow";
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
  });
});
