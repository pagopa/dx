/**
 * Unit tests for config loader.
 */

import { readFile } from "fs/promises";
import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "@/core/config/loader.js";
import { ConfigError, FileError } from "@/core/errors/index.js";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);

describe("loadConfig", () => {
  it("should load and validate config from file", async () => {
    const validConfig = `
action_groups:
  - ag1
data_source: ds1
location: eastus
name: test
oa3_spec: spec.yaml
`;

    mockReadFile.mockResolvedValue(validConfig);

    const config = await loadConfig("config.yaml");

    expect(config).toHaveProperty("action_groups", ["ag1"]);
    expect(config).toHaveProperty("data_source", "ds1");
  });

  it("should throw FileError when file cannot be read", async () => {
    mockReadFile.mockRejectedValue(new Error("File not found"));

    await expect(loadConfig("missing.yaml")).rejects.toThrow(FileError);
  });

  it("should throw ConfigError for invalid YAML", async () => {
    const invalidYaml = `
action_groups:
  - ag1
invalid: yaml: syntax:
`;

    mockReadFile.mockResolvedValue(invalidYaml);

    await expect(loadConfig("config.yaml")).rejects.toThrow(ConfigError);
  });

  it("should throw ConfigError for invalid config schema", async () => {
    const invalidConfig = `
action_groups: []
data_source: ds1
location: eastus
name: test
`;

    mockReadFile.mockResolvedValue(invalidConfig);

    await expect(loadConfig("config.yaml")).rejects.toThrow(ConfigError);
  });

  it("should read from stdin when configPath is -", async () => {
    const validConfig = `
action_groups:
  - ag1
data_source: ds1
location: eastus
name: test
oa3_spec: spec.yaml
`;

    // Mock stdin as a readable stream
    const mockStdin = {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(validConfig);
      },
    };
    Object.assign(process.stdin, mockStdin);

    const config = await loadConfig("-");

    expect(config).toHaveProperty("action_groups", ["ag1"]);
  });
});
