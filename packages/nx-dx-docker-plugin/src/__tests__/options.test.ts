import { beforeEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

const devkitMocks = vi.hoisted(() => ({
  readJsonFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: childProcessMocks.execFileSync,
}));

vi.mock("@nx/devkit", () => ({
  readJsonFile: devkitMocks.readJsonFile,
}));

import { parseDockerReleasePluginOptions } from "../options.ts";

const configureWorkspaceFiles = (
  nxJson: unknown = {},
  packageJson: unknown = { name: "@pagopa/dx" },
): void => {
  devkitMocks.readJsonFile.mockImplementation((path: string) =>
    path.endsWith("nx.json") ? nxJson : packageJson,
  );
};

describe("parseDockerReleasePluginOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureWorkspaceFiles();
  });

  it("requires no options and derives repository metadata from Git", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    expect(parseDockerReleasePluginOptions(undefined, "/workspace")).toEqual({
      buildTargetName: "docker:build",
      defaultBranch: "main",
      imageAuthors: "PagoPA",
      imageNamePrefix: "pagopa/dx",
      imageUrl: "https://github.com/pagopa/dx",
      platform: "linux/amd64,linux/arm64",
      pushTargetName: "docker:push",
      registry: "ghcr.io",
    });
  });

  it("reads default branch and registry from nx.json", () => {
    configureWorkspaceFiles({
      defaultBase: "trunk",
      release: { docker: { registryUrl: "registry.example.com" } },
    });
    childProcessMocks.execFileSync.mockReturnValue(
      "https://github.com/pagopa/dx.git\n",
    );

    const result = parseDockerReleasePluginOptions({}, "/workspace");

    expect(result.defaultBranch).toBe("trunk");
    expect(result.registry).toBe("registry.example.com");
  });

  it("falls back to a scoped root package name without Git metadata", () => {
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    const result = parseDockerReleasePluginOptions(undefined, "/workspace");

    expect(result.imageNamePrefix).toBe("pagopa/dx");
    expect(result.imageUrl).toBe("https://github.com/pagopa/dx");
  });

  it("uses the PagoPA organization convention for unscoped workspaces", () => {
    configureWorkspaceFiles({}, { name: "selfcare-monorepo" });
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    const result = parseDockerReleasePluginOptions(undefined, "/workspace");

    expect(result.imageNamePrefix).toBe("pagopa/selfcare-monorepo");
    expect(result.imageUrl).toBe("https://github.com/pagopa/selfcare-monorepo");
  });

  it("supports optional descriptive metadata overrides", () => {
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    const result = parseDockerReleasePluginOptions(
      {
        imageAuthors: "Custom Team",
        imageNamePrefix: "custom/project",
        imageUrl: "https://example.com/project",
      },
      "/workspace",
    );

    expect(result.imageAuthors).toBe("Custom Team");
    expect(result.imageNamePrefix).toBe("custom/project");
    expect(result.imageUrl).toBe("https://example.com/project");
    expect(childProcessMocks.execFileSync).not.toHaveBeenCalled();
  });

  it("rejects structural plugin options to keep configuration convention-based", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    expect(() =>
      parseDockerReleasePluginOptions({ registry: "custom" }, "/workspace"),
    ).toThrow(/only imageAuthors, imageNamePrefix, and imageUrl/);
  });

  it("fails clearly when repository metadata cannot be inferred", () => {
    configureWorkspaceFiles({}, {});
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    expect(() =>
      parseDockerReleasePluginOptions(undefined, "/workspace"),
    ).toThrow(/root package.json must have a name/);
  });
});
