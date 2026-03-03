import { describe, expect, it, vi } from "vitest";

import { readPackageJson, readPomXml } from "../shared.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import("node:fs/promises");
const mockReadFile = vi.mocked(readFile);

describe("readPackageJson", () => {
  it("returns null when the file does not exist", async () => {
    mockReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    await expect(readPackageJson("missing.json")).resolves.toBeNull();
  });

  it("returns null when JSON is invalid", async () => {
    mockReadFile.mockResolvedValueOnce("not json");
    await expect(readPackageJson("bad.json")).resolves.toBeNull();
  });

  it("returns null when name or version is missing", async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({ name: "@pagopa/pkg" }));
    await expect(readPackageJson("pkg.json")).resolves.toBeNull();
  });

  it("returns null when parsed value is not an object", async () => {
    mockReadFile.mockResolvedValueOnce('"a string"');
    await expect(readPackageJson("pkg.json")).resolves.toBeNull();
  });

  it("returns name, version, and raw when valid", async () => {
    const pkg = { name: "@pagopa/my-lib", private: false, version: "1.2.3" };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(pkg));

    const result = await readPackageJson("package.json");
    expect(result).toEqual({
      name: "@pagopa/my-lib",
      raw: pkg,
      version: "1.2.3",
    });
  });
});

describe("readPomXml", () => {
  it("returns null when the file does not exist", async () => {
    mockReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    await expect(readPomXml("missing.xml")).resolves.toBeNull();
  });

  it("returns null when artifactId is missing", async () => {
    mockReadFile.mockResolvedValueOnce(
      "<project><version>1.0.0</version></project>",
    );
    await expect(readPomXml("pom.xml")).resolves.toBeNull();
  });

  it("returns null when version is missing", async () => {
    mockReadFile.mockResolvedValueOnce(
      "<project><artifactId>my-service</artifactId></project>",
    );
    await expect(readPomXml("pom.xml")).resolves.toBeNull();
  });

  it("returns name and version when both are present", async () => {
    mockReadFile.mockResolvedValueOnce(
      "<project><artifactId>my-service</artifactId><version>2.0.0</version></project>",
    );
    const result = await readPomXml("pom.xml");
    expect(result).toEqual({ name: "my-service", version: "2.0.0" });
  });
});
