import type { ExecutorContext } from "@nx/devkit";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const childProcessMocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

const dockerImageMocks = vi.hoisted(() => ({
  computeReleaseTags: vi.fn(),
}));

const githubSummaryMocks = vi.hoisted(() => ({
  summarizeDockerFailure: vi.fn(),
  summarizeDockerPush: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: fsMocks.existsSync,
  readFileSync: fsMocks.readFileSync,
}));

vi.mock("node:child_process", () => ({
  execFileSync: childProcessMocks.execFileSync,
}));

vi.mock("../../../docker-image.ts", () => ({
  computeReleaseTags: dockerImageMocks.computeReleaseTags,
}));

vi.mock("../../../github-summary.ts", () => ({
  summarizeDockerFailure: githubSummaryMocks.summarizeDockerFailure,
  summarizeDockerPush: githubSummaryMocks.summarizeDockerPush,
}));

import type { ReleasePublishExecutorInput } from "../schema.ts";

import executor from "../release-publish.ts";

const baseContext: ExecutorContext = {
  cwd: process.cwd(),
  isVerbose: false,
  nxJsonConfiguration: {},
  projectGraph: {
    dependencies: {},
    nodes: {},
  },
  projectsConfigurations: {
    projects: {},
    version: 2,
  },
  root: "/workspace",
};

const validOptions = {
  projectName: "my-app",
  projectRoot: "apps/my-app",
} satisfies ReleasePublishExecutorInput;

describe("release-publish executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails without touching docker when required options are missing", async () => {
    const result = await executor({}, baseContext);

    expect(result).toEqual({ success: false });
    expect(fsMocks.existsSync).not.toHaveBeenCalled();
  });

  it("fails when the .docker-version file written by 'nx release version' is missing", async () => {
    fsMocks.existsSync.mockReturnValue(false);

    const result = await executor(validOptions, baseContext);

    expect(result).toEqual({ success: false });
    expect(fsMocks.existsSync).toHaveBeenCalledWith(
      "/workspace/tmp/apps/my-app/.docker-version",
    );
  });

  it("does not push in dry-run mode", async () => {
    vi.stubEnv("NX_DRY_RUN", "true");
    fsMocks.existsSync.mockReturnValue(true);
    fsMocks.readFileSync.mockReturnValue("ghcr.io/pagopa/dx/my-app:1.2.3");
    dockerImageMocks.computeReleaseTags.mockReturnValue([
      "1.2.3",
      "1.2",
      "1",
      "latest",
    ]);

    const result = await executor(validOptions, baseContext);

    expect(result).toEqual({ success: true });
    expect(childProcessMocks.execFileSync).not.toHaveBeenCalled();
  });

  it("pushes the primary version tag plus every alias tag", async () => {
    fsMocks.existsSync.mockReturnValue(true);
    fsMocks.readFileSync.mockReturnValue("ghcr.io/pagopa/dx/my-app:1.2.3");
    dockerImageMocks.computeReleaseTags.mockReturnValue([
      "1.2.3",
      "1.2",
      "1",
      "latest",
    ]);

    const result = await executor(validOptions, baseContext);

    expect(result).toEqual({ success: true });
    expect(childProcessMocks.execFileSync).toHaveBeenCalledWith(
      "docker",
      ["push", "ghcr.io/pagopa/dx/my-app:1.2.3"],
      expect.anything(),
    );
    expect(childProcessMocks.execFileSync).toHaveBeenCalledWith(
      "docker",
      [
        "tag",
        "ghcr.io/pagopa/dx/my-app:1.2.3",
        "ghcr.io/pagopa/dx/my-app:latest",
      ],
      expect.anything(),
    );
    expect(childProcessMocks.execFileSync).toHaveBeenCalledWith(
      "docker",
      ["push", "ghcr.io/pagopa/dx/my-app:latest"],
      expect.anything(),
    );
    expect(githubSummaryMocks.summarizeDockerPush).toHaveBeenCalledWith(
      "my-app",
      "ghcr.io/pagopa/dx/my-app",
      ["1.2.3", "1.2", "1", "latest"],
    );
  });

  it("reports a failure when the docker push fails", async () => {
    fsMocks.existsSync.mockReturnValue(true);
    fsMocks.readFileSync.mockReturnValue("ghcr.io/pagopa/dx/my-app:1.2.3");
    dockerImageMocks.computeReleaseTags.mockReturnValue(["1.2.3"]);
    childProcessMocks.execFileSync.mockImplementation(() => {
      throw new Error("docker push failed");
    });

    const result = await executor(validOptions, baseContext);

    expect(result).toEqual({ success: false });
    expect(githubSummaryMocks.summarizeDockerFailure).toHaveBeenCalledWith(
      "my-app",
      "push",
      1,
    );
    expect(githubSummaryMocks.summarizeDockerPush).not.toHaveBeenCalled();
  });
});
