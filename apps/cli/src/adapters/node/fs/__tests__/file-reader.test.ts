import { err, ok } from "neverthrow";
import { Stats } from "node:fs";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { fileExists, readFile, readFileAndDecode } from "../file-reader.js";

describe("readFileAndDecode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testSchema = z.object({
    name: z.string(),
    version: z.string(),
  });

  type TestData = z.infer<typeof testSchema>;
  const validData: TestData = {
    name: "test-package",
    version: "1.0.0",
  };

  it("should read and parse a file", async () => {
    const filePath = "/path/to/file.json";
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(JSON.stringify(validData));

    const result = await readFileAndDecode(filePath, testSchema);

    expect(result).toStrictEqual(ok(validData));
    expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf-8");
  });

  it("should return error when file does not exist", async () => {
    const filePath = "/path/to/nonexistent.json";
    vi.spyOn(fs, "readFile").mockRejectedValueOnce(
      new Error("ENOENT: no such file or directory"),
    );

    const result = await readFileAndDecode(filePath, testSchema);

    expect(result).toStrictEqual(
      err(new Error("Failed to read file: /path/to/nonexistent.json")),
    );
  });

  it("should return error when JSON parsing fails", async () => {
    const filePath = "/path/to/file.yaml";
    vi.spyOn(fs, "readFile").mockResolvedValueOnce("not a json");

    const result = await readFileAndDecode(filePath, testSchema);

    expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
  });

  it("should return error when schema decoding fails", async () => {
    const filePath = "/path/to/file.json";
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(
      JSON.stringify({ name: "test-package" }),
    );

    const result = await readFileAndDecode(filePath, testSchema);

    expect(result).toStrictEqual(
      err(new Error("File content is not valid for the given schema")),
    );
  });
});

describe("readFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read a file when it exists", async () => {
    const filePath = "/path/to/existing.txt";
    const fileContent = "hello world";
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(fileContent);

    const result = await readFile(filePath);
    expect(result).toStrictEqual(ok(fileContent));
    expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf-8");
  });

  it("should return error when file does not exist", async () => {
    const filePath = "/path/to/missing.txt";
    vi.spyOn(fs, "readFile").mockRejectedValueOnce(
      new Error("ENOENT: no such file or directory"),
    );

    const result = await readFile(filePath);
    expect(result).toStrictEqual(
      err(new Error("Failed to read file: /path/to/missing.txt")),
    );
  });
});

describe("fileExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when the path exists", async () => {
    vi.spyOn(fs, "stat").mockResolvedValueOnce({} as Stats);
    const result = await fileExists("/path/to/file.txt");
    expect(result).toStrictEqual(ok(true));
    expect(fs.stat).toHaveBeenCalledWith("/path/to/file.txt");
  });

  it("should return the error when the path does not exist", async () => {
    vi.spyOn(fs, "stat").mockRejectedValueOnce(new Error("not found"));
    const result = await fileExists("/path/to/missing.txt");
    expect(result).toStrictEqual(
      err(new Error("/path/to/missing.txt not found.")),
    );
    expect(fs.stat).toHaveBeenCalledWith("/path/to/missing.txt");
  });
});

describe("readFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read a file when it exists", async () => {
    const filePath = "/path/to/existing.txt";
    const fileContent = "hello world";
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(fileContent);

    const result = await readFile(filePath);
    expect(result).toStrictEqual(ok(fileContent));
    expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf-8");
  });

  it("should return error when file does not exist", async () => {
    const filePath = "/path/to/missing.txt";
    vi.spyOn(fs, "readFile").mockRejectedValueOnce(
      new Error("ENOENT: no such file or directory"),
    );

    const result = await readFile(filePath);
    expect(result).toStrictEqual(
      err(new Error("Failed to read file: /path/to/missing.txt")),
    );
  });
});
