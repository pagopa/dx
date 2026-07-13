import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
}));

const devkitMocks = vi.hoisted(() => ({
  readJsonFile: vi.fn(),
}));

const childProcessMocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: fsMocks.existsSync,
}));

vi.mock("@nx/devkit", () => ({
  readJsonFile: devkitMocks.readJsonFile,
}));

vi.mock("node:child_process", () => ({
  execFileSync: childProcessMocks.execFileSync,
}));

import {
  computeImageTags,
  computeReleaseTags,
  getImageName,
  getProjectDisplayName,
  getProjectSlug,
  isHighestReleasedVersion,
} from "../docker-image.ts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProjectSlug", () => {
  it("slugifies a nested project root", () => {
    expect(getProjectSlug("apps/my-app")).toBe("apps-my-app");
  });

  it("lowercases and strips a leading slash", () => {
    expect(getProjectSlug("/Apps/My App")).toBe("apps-my-app");
  });
});

describe("getProjectDisplayName", () => {
  it("returns the package.json name when present", () => {
    fsMocks.existsSync.mockReturnValue(true);
    devkitMocks.readJsonFile.mockReturnValue({ name: "@scope/my-app" });

    const result = getProjectDisplayName("/workspace", "apps/my-app");

    expect(result).toBe("@scope/my-app");
  });

  it("falls back to the project slug when there is no package.json", () => {
    fsMocks.existsSync.mockReturnValue(false);

    const result = getProjectDisplayName("/workspace", "apps/my-app");

    expect(result).toBe("apps-my-app");
  });

  it("falls back to the project slug when package.json has no name", () => {
    fsMocks.existsSync.mockReturnValue(true);
    devkitMocks.readJsonFile.mockReturnValue({});

    const result = getProjectDisplayName("/workspace", "apps/my-app");

    expect(result).toBe("apps-my-app");
  });
});

describe("getImageName", () => {
  it("builds <registry>/<prefix>/<slug> from the project display name, stripping any npm scope", () => {
    const result = getImageName("ghcr.io", "pagopa/dx", "@pagopa/my-app");

    expect(result).toBe("ghcr.io/pagopa/dx/my-app");
  });

  it("slugifies a path-derived display name unchanged (no package.json case)", () => {
    const result = getImageName("ghcr.io", "pagopa/dx", "apps-my-app");

    expect(result).toBe("ghcr.io/pagopa/dx/apps-my-app");
  });

  it("uses the repository name override instead of prefix/slug", () => {
    const result = getImageName(
      "ghcr.io",
      "pagopa/dx",
      "@pagopa/my-app",
      "custom/repo-name",
    );

    expect(result).toBe("ghcr.io/custom/repo-name");
  });
});

describe("isHighestReleasedVersion", () => {
  it("returns true when no other release tags exist", () => {
    childProcessMocks.execFileSync.mockReturnValue("");

    expect(isHighestReleasedVersion("my-app", "1.0.0")).toBe(true);
  });

  it("returns true when git is unavailable", () => {
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("not a git repository");
    });

    expect(isHighestReleasedVersion("my-app", "1.0.0")).toBe(true);
  });

  it("returns false when a higher version was already released", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "my-app@1.0.0\nmy-app@2.0.0\n",
    );

    expect(isHighestReleasedVersion("my-app", "1.0.0")).toBe(false);
  });

  it("returns true when this is the highest of several released versions", () => {
    childProcessMocks.execFileSync.mockReturnValue(
      "my-app@1.0.0\nmy-app@0.9.0\n",
    );

    expect(isHighestReleasedVersion("my-app", "1.0.0")).toBe(true);
  });

  it("compares numeric prerelease identifiers using SemVer precedence", () => {
    childProcessMocks.execFileSync.mockReturnValue("my-app@1.0.0-rc.10\n");

    expect(isHighestReleasedVersion("my-app", "1.0.0-rc.2")).toBe(false);
  });

  it("gives numeric prerelease identifiers lower precedence than non-numeric ones", () => {
    childProcessMocks.execFileSync.mockReturnValue("my-app@1.0.0-beta.alpha\n");

    expect(isHighestReleasedVersion("my-app", "1.0.0-beta.1")).toBe(false);
  });
});

describe("computeReleaseTags", () => {
  it("returns an empty array for a non-semver version", () => {
    expect(computeReleaseTags("my-app", "not-a-version")).toEqual([]);
  });

  it("rejects SemVer build metadata because it is not a valid Docker tag", () => {
    expect(computeReleaseTags("my-app", "1.2.3+build.1")).toEqual([]);
  });

  it("rejects non-strict SemVer strings", () => {
    expect(computeReleaseTags("my-app", "v1.2.3")).toEqual([]);
    expect(computeReleaseTags("my-app", "01.2.3")).toEqual([]);
  });

  it("includes version, major.minor, major, and latest for a stable highest release", () => {
    childProcessMocks.execFileSync.mockReturnValue("");

    expect(computeReleaseTags("my-app", "1.2.3")).toEqual([
      "1.2.3",
      "1.2",
      "1",
      "latest",
    ]);
  });

  it("skips the major-only alias for a 0.x release", () => {
    childProcessMocks.execFileSync.mockReturnValue("");

    expect(computeReleaseTags("my-app", "0.2.3")).toEqual([
      "0.2.3",
      "0.2",
      "latest",
    ]);
  });

  it("omits latest when a higher version was already released", () => {
    childProcessMocks.execFileSync.mockReturnValue("my-app@9.0.0\n");

    expect(computeReleaseTags("my-app", "1.2.3")).toEqual([
      "1.2.3",
      "1.2",
      "1",
    ]);
  });
});

describe("computeImageTags", () => {
  it("returns an empty array outside of CI", () => {
    expect(computeImageTags("my-app", "main", {})).toEqual([]);
  });

  it("adds a short-sha tag when GITHUB_SHA is set", () => {
    const result = computeImageTags("my-app", "main", {
      GITHUB_SHA: "abcdef1234567890",
    });

    expect(result).toEqual(["sha-abcdef1"]);
  });

  it("adds a slugified branch tag, plus latest on the default branch", () => {
    const result = computeImageTags("my-app", "main", {
      GITHUB_REF_NAME: "main",
      GITHUB_REF_TYPE: "branch",
    });

    expect(result).toEqual(["main", "latest"]);
  });

  it("does not add latest for a non-default branch", () => {
    const result = computeImageTags("my-app", "main", {
      GITHUB_REF_NAME: "feature/foo",
      GITHUB_REF_TYPE: "branch",
    });

    expect(result).toEqual(["feature-foo"]);
  });

  it("adds release tags for a matching release git tag", () => {
    childProcessMocks.execFileSync.mockReturnValue("");

    const result = computeImageTags("my-app", "main", {
      GITHUB_REF_NAME: "my-app@1.2.3",
      GITHUB_REF_TYPE: "tag",
    });

    expect(result).toEqual(["1.2.3", "1.2", "1", "latest"]);
  });

  it("ignores a git tag that does not belong to this project", () => {
    const result = computeImageTags("my-app", "main", {
      GITHUB_REF_NAME: "other-app@1.2.3",
      GITHUB_REF_TYPE: "tag",
    });

    expect(result).toEqual([]);
  });
});
