import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readFile } from "../index.js";

describe("readFile", () => {
  const directory = "/some/directory";
  const filename = "test.txt";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return file content when file exists", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValueOnce("file content");

    const result = await readFile(directory, filename);

    expect(result).toStrictEqual(ok("file content"));
    expect(fs.readFile).toHaveBeenCalledWith(
      "/some/directory/test.txt",
      "utf-8",
    );
  });

  it("should return error when file does not exist", async () => {
    vi.spyOn(fs, "readFile").mockRejectedValueOnce(new Error("any error"));

    const result = await readFile(directory, filename);

    expect(result).toStrictEqual(
      err(new Error("Failed to read file: /some/directory/test.txt")),
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      "/some/directory/test.txt",
      "utf-8",
    );
  });
});
