import { beforeEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: childProcessMocks.execFileSync,
}));

import { parseDockerReleasePluginOptions } from "../options.ts";

describe("parseDockerReleasePluginOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies defaults and derives imageNamePrefix/imageUrl from a github.com origin", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    const result = parseDockerReleasePluginOptions(
      { imageAuthors: "PagoPA" },
      "/workspace",
    );

    expect(result).toEqual({
      buildTargetName: "docker:build",
      defaultBranch: "main",
      imageAuthors: "PagoPA",
      imageNamePrefix: "pagopa/dx",
      imageUrl: "https://github.com/pagopa/dx",
      jsBuildTargetName: "build",
      packageTargetName: "package",
      platform: "linux/amd64,linux/arm64",
      pushTargetName: "docker:push",
      registry: "ghcr.io",
    });
  });

  it("supports https origins", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "https://github.com/pagopa/dx.git\n",
    );

    const result = parseDockerReleasePluginOptions(
      { imageAuthors: "PagoPA" },
      "/workspace",
    );

    expect(result.imageNamePrefix).toBe("pagopa/dx");
    expect(result.imageUrl).toBe("https://github.com/pagopa/dx");
  });

  it("prefers explicit options over git-origin auto-detection", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    const result = parseDockerReleasePluginOptions(
      {
        imageAuthors: "PagoPA",
        imageNamePrefix: "custom/prefix",
        imageUrl: "https://example.com",
      },
      "/workspace",
    );

    expect(result.imageNamePrefix).toBe("custom/prefix");
    expect(result.imageUrl).toBe("https://example.com");
  });

  it("uses explicit repository metadata when no git origin is available", () => {
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    const result = parseDockerReleasePluginOptions(
      {
        imageAuthors: "PagoPA",
        imageNamePrefix: "pagopa/dx",
        imageUrl: "https://github.com/pagopa/dx",
      },
      "/workspace",
    );

    expect(result.imageNamePrefix).toBe("pagopa/dx");
    expect(result.imageUrl).toBe("https://github.com/pagopa/dx");
    expect(childProcessMocks.execFileSync).not.toHaveBeenCalled();
  });

  it("allows overriding the platform default", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    const result = parseDockerReleasePluginOptions(
      { imageAuthors: "PagoPA", platform: "linux/amd64" },
      "/workspace",
    );

    expect(result.platform).toBe("linux/amd64");
  });

  it("throws when imageAuthors is missing", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@github.com:pagopa/dx.git\n",
    );

    expect(() => parseDockerReleasePluginOptions({}, "/workspace")).toThrow(
      /Invalid @pagopa\/nx-dx-docker-plugin options/,
    );
  });

  it("throws when imageNamePrefix/imageUrl are missing and cannot be auto-detected", () => {
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    expect(() =>
      parseDockerReleasePluginOptions({ imageAuthors: "PagoPA" }, "/workspace"),
    ).toThrow(/could not be auto-detected/);
  });

  it("throws when the origin is not hosted on github.com", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "git@gitlab.com:pagopa/dx.git\n",
    );

    expect(() =>
      parseDockerReleasePluginOptions({ imageAuthors: "PagoPA" }, "/workspace"),
    ).toThrow(/could not be auto-detected/);
  });
});
