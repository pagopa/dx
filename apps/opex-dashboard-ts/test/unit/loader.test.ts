/**
 * Unit tests for config loader.
 */

import { readFileSync } from "fs";
import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "@/core/config/loader.js";
import { ConfigError, FileError } from "@/core/errors/index.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

const mockReadFileSync = vi.mocked(readFileSync);

describe("loadConfig", () => {
  it("should load and validate config from file", () => {
    const validConfig = `
action_groups:
  - ag1
data_source: ds1
location: eastus
name: test
oa3_spec: spec.yaml
`;

    mockReadFileSync.mockReturnValue(validConfig);

    const config = loadConfig("config.yaml");

    expect(config).toHaveProperty("action_groups", ["ag1"]);
    expect(config).toHaveProperty("data_source", "ds1");
  });

  it("should throw FileError when file cannot be read", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("File not found");
    });

    expect(() => loadConfig("missing.yaml")).toThrow(FileError);
  });

  it("should throw ConfigError for invalid YAML", () => {
    const invalidYaml = `
action_groups:
  - ag1
invalid: yaml: syntax:
`;

    mockReadFileSync.mockReturnValue(invalidYaml);

    expect(() => loadConfig("config.yaml")).toThrow(ConfigError);
  });

  it("should throw ConfigError for invalid config schema", () => {
    const invalidConfig = `
action_groups: []
data_source: ds1
location: eastus
name: test
`;

    mockReadFileSync.mockReturnValue(invalidConfig);

    expect(() => loadConfig("config.yaml")).toThrow(ConfigError);
  });

  it("should read from stdin when configPath is -", () => {
    const validConfig = `
action_groups:
  - ag1
data_source: ds1
location: eastus
name: test
oa3_spec: spec.yaml
`;

    mockReadFileSync.mockReturnValue(validConfig);

    const config = loadConfig("-");

    expect(mockReadFileSync).toHaveBeenCalledWith(0, "utf-8");
    expect(config).toHaveProperty("action_groups", ["ag1"]);
  });
});
