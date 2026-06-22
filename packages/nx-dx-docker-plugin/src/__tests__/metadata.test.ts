/**
 * Covers OCI metadata inference from package/project metadata and git fallbacks.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execSync: vi.fn<(...args: [string, ...unknown[]]) => string>((command: string) => {
    if (command === "git config --get remote.origin.url") {
      return "git@github.com:acme/platform.git\n";
    }

    if (command === "git rev-parse HEAD") {
      return "1234567890abcdef\n";
    }

    throw new Error(`Unexpected command: ${command}`);
  }),
}));

vi.mock("node:child_process", () => ({
  execSync: childProcessMocks.execSync,
}));

import {
  getAutomaticDockerLabelArgs,
  getDefaultDockerImageAuthors,
  getProjectDescriptor,
} from "../metadata.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-docker-metadata-"),
  );

  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });

  return workspaceRoot;
};

describe("getProjectDescriptor", () => {
  beforeEach(() => {
    childProcessMocks.execSync.mockClear();
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command === "git config --get remote.origin.url") {
        return "git@github.com:acme/platform.git\n";
      }

      if (command === "git rev-parse HEAD") {
        return "1234567890abcdef\n";
      }

      throw new Error(`Unexpected command: ${command}`);
    });
  });

  it("prefers project.json identity metadata and normalizes repository URLs", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "portal");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      JSON.stringify({
        description: "Portal\napplication",
        name: "@acme/portal",
        repository: {
          url: "git+ssh://git@github.com/acme/portal.git",
        },
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "project.json"),
      JSON.stringify({
        description: "Fallback description",
        name: "portal-project",
      }),
      "utf8",
    );

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "fallback-name")).toEqual({
      description: "Fallback description",
      name: "portal-project",
      repositoryUrl: "https://github.com/acme/portal",
      sourceUrl: "https://github.com/acme/portal/blob/main/apps/portal",
    });
  });

  it("falls back to project.json and git remote when package metadata is absent", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "widget");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "project.json"),
      JSON.stringify({
        description: "Widget package",
        name: "widget",
      }),
      "utf8",
    );

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "fallback-name")).toEqual({
      description: "Widget package",
      name: "widget",
      repositoryUrl: "https://github.com/acme/platform",
      sourceUrl: "https://github.com/acme/platform/blob/main/packages/widget",
    });
  });

  it("accepts repository fields written as plain strings", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "cli");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "project.json"),
      JSON.stringify({
        description: "CLI package",
        name: "cli",
        repository: "git://github.com/acme/cli.git",
      }),
      "utf8",
    );

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "fallback-name")).toEqual({
      description: "CLI package",
      name: "cli",
      repositoryUrl: "https://github.com/acme/cli",
      sourceUrl: "https://github.com/acme/cli/blob/main/packages/cli",
    });
  });

  it("falls back when the repository field is blank after trimming", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "blank-repo");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      JSON.stringify({
        name: "blank-repo",
        repository: "   ",
      }),
      "utf8",
    );

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "fallback-name")).toEqual({
      description: "fallback-name",
      name: "blank-repo",
      repositoryUrl: "https://github.com/acme/platform",
      sourceUrl: "https://github.com/acme/platform/blob/main/packages/blank-repo",
    });
  });

  it("falls back to the default repository URL when git metadata is unavailable", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "worker");

    childProcessMocks.execSync.mockImplementation(() => {
      throw new Error("git unavailable");
    });
    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "worker")).toEqual({
      description: "worker",
      name: "worker",
      repositoryUrl: "https://github.com/pagopa/dx",
      sourceUrl: "https://github.com/pagopa/dx/blob/main/packages/worker",
    });
  });

  it("throws a useful error when metadata JSON is invalid", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "broken");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      "{not-json}\n",
      "utf8",
    );

    expect(() => getProjectDescriptor(workspaceRoot, projectRoot, "broken-app")).toThrow(
      `Could not parse ${path.join(workspaceRoot, projectRoot, "package.json")}.`,
    );
  });

  it("falls back cleanly when metadata JSON is valid but does not match the expected schema", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "odd-package");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      JSON.stringify({
        name: "odd-package",
        repository: 123,
      }),
      "utf8",
    );

    expect(getProjectDescriptor(workspaceRoot, projectRoot, "fallback-name")).toEqual({
      description: "fallback-name",
      name: "fallback-name",
      repositoryUrl: "https://github.com/acme/platform",
      sourceUrl: "https://github.com/acme/platform/blob/main/apps/odd-package",
    });
  });
});

describe("getAutomaticDockerLabelArgs", () => {
  beforeEach(() => {
    childProcessMocks.execSync.mockClear();
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command === "git config --get remote.origin.url") {
        return "git@github.com:acme/platform.git\n";
      }

      if (command === "git rev-parse HEAD") {
        return "1234567890abcdef\n";
      }

      throw new Error(`Unexpected command: ${command}`);
    });
  });

  it("renders OCI labels and quotes newline-heavy values safely", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "portal");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      JSON.stringify({
        description: "Portal\napplication",
        name: "portal",
      }),
      "utf8",
    );

    expect(
      getAutomaticDockerLabelArgs(workspaceRoot, projectRoot, "fallback", "ACME Team"),
    ).toEqual([
      '--label org.opencontainers.image.title="portal"',
      '--label org.opencontainers.image.description="Portal application"',
      '--label org.opencontainers.image.authors="ACME Team"',
      '--label org.opencontainers.image.url="https://github.com/acme/platform"',
      '--label org.opencontainers.image.source="https://github.com/acme/platform/blob/main/apps/portal"',
      '--label org.opencontainers.image.revision="1234567890abcdef"',
      "--provenance=false",
    ]);
  });

  it("omits the revision label when git HEAD cannot be resolved", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "worker");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command === "git config --get remote.origin.url") {
        return "https://github.com/acme/platform.git\n";
      }

      if (command === "git rev-parse HEAD") {
        throw new Error("missing head");
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    expect(
      getAutomaticDockerLabelArgs(workspaceRoot, projectRoot, "worker", "ACME Team"),
    ).not.toContainEqual(expect.stringContaining("org.opencontainers.image.revision"));
  });
});

describe("getDefaultDockerImageAuthors", () => {
  beforeEach(() => {
    childProcessMocks.execSync.mockClear();
  });

  it("derives the default author from the GitHub owner of the workspace remote", () => {
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command === "git config --get remote.origin.url") {
        return "git@github.com:acme/platform.git\n";
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    expect(getDefaultDockerImageAuthors("/workspace")).toBe("acme");
  });

  it("falls back to PagoPA when the workspace remote is unavailable", () => {
    childProcessMocks.execSync.mockImplementation(() => {
      throw new Error("git unavailable");
    });

    expect(getDefaultDockerImageAuthors("/workspace")).toBe("PagoPA");
  });
});