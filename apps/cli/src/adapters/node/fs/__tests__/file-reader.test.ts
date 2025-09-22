import { fs, vol } from "memfs";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { fileExists, readFile, readFileAndDecode } from "../file-reader.js";

vi.mock("node:fs/promises");

describe("readFileAndDecode", () => {
  const testSchema = z.object({
    name: z.string(),
    version: z.string(),
  });

  type TestData = z.infer<typeof testSchema>;
  const validData: TestData = {
    name: "test-package",
    version: "1.0.0",
  };

  beforeEach(() => {
    vol.reset();
    vol.fromJSON(
      {
        "./file.json": JSON.stringify(validData),
        "./file.yaml": "name: test-package\nversion: 1.0.0",
        "./invalid.json": JSON.stringify({ invalidKey: "anInvalidKey" }),
      },
      ".",
    );
  });

  it("should read and parse a file", async () => {
    const spy = vi.spyOn(fs.promises, "readFile");
    const result = await readFileAndDecode("file.json", testSchema);

    expect(result).toStrictEqual(ok(validData));
    expect(spy).toHaveBeenCalledWith("file.json", "utf-8");
  });

  it("should return error when file does not exist", async () => {
    const result = await readFileAndDecode("nonexistent.json", testSchema);

    expect(result).toStrictEqual(
      err(new Error("Failed to read file: nonexistent.json")),
    );
  });

  it("should return error when JSON parsing fails", async () => {
    const result = await readFileAndDecode("file.yaml", testSchema);

    expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
  });

  it("should return error when schema decoding fails", async () => {
    const spy = vi.spyOn(fs.promises, "readFile");
    const result = await readFileAndDecode("invalid.json", testSchema);

    expect(result).toStrictEqual(
      err(new Error("File content is not valid for the given schema")),
    );
    expect(spy).toHaveBeenCalledWith("invalid.json", "utf-8");
  });
});

describe("readFile", () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(
      {
        "./existing.txt": "hello world",
      },
      ".",
    );
  });

  it("should read a file when it exists", async () => {
    const spy = vi.spyOn(fs.promises, "readFile");

    const result = await readFile("existing.txt");

    expect(result).toStrictEqual(ok("hello world"));
    expect(spy).toHaveBeenCalledWith("existing.txt", "utf-8");
  });

  it("should return error when file does not exist", async () => {
    const result = await readFile("/missing.txt");
    expect(result).toStrictEqual(
      err(new Error("Failed to read file: /missing.txt")),
    );
  });
});

describe("fileExists", () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(
      {
        "./file.txt": "content",
      },
      ".",
    );
  });

  it("should return true when the path exists", async () => {
    const spy = vi.spyOn(fs.promises, "stat");

    const result = await fileExists("file.txt");

    expect(result).toStrictEqual(ok(true));
    expect(spy).toHaveBeenCalledWith("file.txt");
  });

  it("should return the error when the path does not exist", async () => {
    const result = await fileExists("missing.txt");

    expect(result).toStrictEqual(err(new Error("missing.txt not found.")));
  });
});
