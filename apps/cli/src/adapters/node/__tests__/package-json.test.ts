import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePackageJsonReader } from "../package-json";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

describe("makePackageJsonReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const directory = "/some/dir";

  it("parses scripts from package.json", async () => {
    const mockPackageJson = JSON.stringify({
      name: "test-package",
      scripts: {
        build: "aScript",
        "code-review": "aCodeReviewScript",
      },
    });

    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockPackageJson,
    );

    const packageJsonReader = makePackageJsonReader();
    const result = await packageJsonReader.getScripts(directory);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const scripts = result.value;
      expect(scripts).toStrictEqual([
        {
          name: "build",
          script: "aScript",
        },
        {
          name: "code-review",
          script: "aCodeReviewScript",
        },
      ]);
    }

    expect(readFile).toHaveBeenCalledWith(`${directory}/package.json`, "utf-8");
  });

  it("should return an empty array when no scripts exist", async () => {
    const mockPackageJson = JSON.stringify({
      name: "test-package",
      version: "1.0.0",
    });

    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockPackageJson,
    );

    const packageJsonReader = makePackageJsonReader();
    const result = await packageJsonReader.getScripts(directory);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const scripts = result.value;
      expect(scripts).toStrictEqual([]);
    }
  });

  it("should return an error when package.json does not exist", async () => {
    (readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("No such file or directory"),
    );

    const packageJsonReader = makePackageJsonReader();
    const result = await packageJsonReader.getScripts(directory);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.message).toContain("Failed to read package.json");
    }
  });

  it("should return an error when package.json is invalid JSON", async () => {
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      "invalid json content",
    );

    const packageJsonReader = makePackageJsonReader();
    const result = await packageJsonReader.getScripts(directory);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.message).toContain("Failed to parse JSON");
    }
  });
});
