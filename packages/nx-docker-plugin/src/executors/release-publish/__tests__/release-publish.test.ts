/**
 * Covers Docker publish orchestration without requiring a real Docker daemon.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execSync: vi.fn<(...args: [string, ...unknown[]]) => string>(() => ""),
}));

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => "ghcr.io/pagopa/example:1.2.3"),
  rmSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: childProcessMocks.execSync,
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: fsMocks.existsSync,
    readFileSync: fsMocks.readFileSync,
    rmSync: fsMocks.rmSync,
  };
});

import {
  type DockerPublishExecutorContext,
  releasePublishExecutor,
} from "../release-publish.ts";

const createContext = (): DockerPublishExecutorContext => ({
  projectGraph: {
    nodes: {
      sample: {
        data: {
          root: "apps/sample",
        },
      },
    },
  },
  projectName: "sample",
  root: "/workspace",
});

describe("release-publish executor", () => {
  afterEach(() => {
    childProcessMocks.execSync.mockClear();
    fsMocks.existsSync.mockClear();
    fsMocks.readFileSync.mockClear();
    fsMocks.rmSync.mockClear();
    fsMocks.existsSync.mockImplementation(() => true);
    fsMocks.readFileSync.mockImplementation(() => "ghcr.io/pagopa/example:1.2.3");
    childProcessMocks.execSync.mockImplementation(() => "");
    delete process.env.NX_DRY_RUN;
  });

  it("pushes the versioned tag and latest tag", async () => {
    await releasePublishExecutor({ quiet: true }, createContext());

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker image inspect ghcr.io/pagopa/example:1.2.3",
      expect.any(Object),
    );
    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker push ghcr.io/pagopa/example:1.2.3",
      expect.any(Object),
    );
    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker tag ghcr.io/pagopa/example:1.2.3 ghcr.io/pagopa/example:latest",
      expect.any(Object),
    );
    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker push ghcr.io/pagopa/example:latest",
      expect.any(Object),
    );
    expect(fsMocks.rmSync).toHaveBeenCalledWith(
      "/workspace/tmp/apps/sample",
      {
        force: true,
        recursive: true,
      },
    );
  });

  it("does not execute Docker commands in dry run mode", async () => {
    process.env.NX_DRY_RUN = "true";

    await releasePublishExecutor({ quiet: true }, createContext());

    expect(childProcessMocks.execSync).not.toHaveBeenCalled();
    expect(fsMocks.rmSync).not.toHaveBeenCalled();
  });

  it("supports dry-run through executor options without NX_DRY_RUN", async () => {
    await releasePublishExecutor({ dryRun: true, quiet: true }, createContext());

    expect(childProcessMocks.execSync).not.toHaveBeenCalled();
  });

  it("normalizes docker.io image references before the local inspect step", async () => {
    fsMocks.readFileSync.mockImplementation(() => "docker.io/acme/example:1.2.3");

    await releasePublishExecutor({ quiet: true }, createContext());

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker image inspect acme/example:1.2.3",
      expect.any(Object),
    );
  });

  it("throws when the executor context does not resolve the current project", async () => {
    await expect(
      releasePublishExecutor({ quiet: true }, { root: "/workspace" }),
    ).rejects.toThrow("Could not resolve the current project for Docker publish.");
  });

  it("throws when the version file is missing", async () => {
    fsMocks.existsSync.mockImplementation(() => false);

    await expect(releasePublishExecutor({ quiet: true }, createContext())).rejects.toThrow(
      "Could not find /workspace/tmp/apps/sample/.docker-version. Did you run 'nx release version'?",
    );
  });

  it("throws when the version file is empty", async () => {
    fsMocks.readFileSync.mockImplementation(() => "   ");

    await expect(releasePublishExecutor({ quiet: true }, createContext())).rejects.toThrow(
      "The file /workspace/tmp/apps/sample/.docker-version is empty.",
    );
  });

  it("throws when the image reference does not include an explicit tag", async () => {
    fsMocks.readFileSync.mockImplementation(() => "ghcr.io/pagopa/example");

    await expect(releasePublishExecutor({ quiet: true }, createContext())).rejects.toThrow(
      "Image reference 'ghcr.io/pagopa/example' does not contain an explicit version tag.",
    );
  });

  it("throws when the tagged local image cannot be found", async () => {
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command.startsWith("docker image inspect")) {
        throw new Error("missing image");
      }

      return "";
    });

    await expect(releasePublishExecutor({ quiet: true }, createContext())).rejects.toThrow(
      "Could not find local Docker image 'ghcr.io/pagopa/example:1.2.3'. Did you run 'nx release version'?",
    );
    expect(fsMocks.rmSync).not.toHaveBeenCalled();
  });

  it("throws when executor options are invalid", async () => {
    await expect(
      releasePublishExecutor(JSON.parse('{"quiet":"yes"}'), createContext()),
    ).rejects.toThrow("Invalid Docker publish executor options.");
  });

  it("uses inherited stdio when quiet mode is disabled", async () => {
    await releasePublishExecutor({ quiet: false }, createContext());

    expect(childProcessMocks.execSync).toHaveBeenNthCalledWith(
      2,
      "docker push ghcr.io/pagopa/example:1.2.3",
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("defaults to non-quiet Docker commands when quiet is omitted", async () => {
    await releasePublishExecutor({}, createContext());

    expect(childProcessMocks.execSync).toHaveBeenNthCalledWith(
      2,
      "docker push ghcr.io/pagopa/example:1.2.3",
      expect.objectContaining({ stdio: "inherit" }),
    );
  });
});