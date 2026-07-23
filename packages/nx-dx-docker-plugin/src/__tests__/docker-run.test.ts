import { beforeEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn(),
}));

const dockerImageMocks = vi.hoisted(() => ({
  computeImageTags: vi.fn(),
  getProjectSlug: vi.fn(),
}));

const githubSummaryMocks = vi.hoisted(() => ({
  summarizeDockerFailure: vi.fn(),
  summarizeDockerPush: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: childProcessMocks.execFileSync,
  spawnSync: childProcessMocks.spawnSync,
}));

vi.mock("../docker-image.ts", () => ({
  computeImageTags: dockerImageMocks.computeImageTags,
  getProjectSlug: dockerImageMocks.getProjectSlug,
}));

vi.mock("../github-summary.ts", () => ({
  summarizeDockerFailure: githubSummaryMocks.summarizeDockerFailure,
  summarizeDockerPush: githubSummaryMocks.summarizeDockerPush,
}));

import type { DockerRunOptions } from "../docker-run.ts";

import { runDockerCommand } from "../docker-run.ts";

const baseOptions: DockerRunOptions = {
  contextPath: ".",
  defaultBranch: "main",
  dockerfilePath: "apps/my-app/Dockerfile",
  imageAuthors: "PagoPA",
  imageName: "ghcr.io/pagopa/dx/my-app",
  imageUrl: "https://github.com/pagopa/dx",
  platform: "linux/amd64,linux/arm64",
  projectDisplayName: "my-app",
  projectRoot: "apps/my-app",
};

describe("runDockerCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips publishing in push mode when there are no CI-computed tags", () => {
    dockerImageMocks.computeImageTags.mockReturnValue([]);

    const result = runDockerCommand("push", baseOptions, "/workspace");

    expect(result).toEqual({ success: true });
    expect(childProcessMocks.spawnSync).not.toHaveBeenCalled();
  });

  it("builds locally with the untagged alias tag and a dev fallback tag", () => {
    dockerImageMocks.computeImageTags.mockReturnValue([]);
    dockerImageMocks.getProjectSlug.mockReturnValue("apps-my-app");
    childProcessMocks.execFileSync.mockReturnValue("abc1234\n");
    childProcessMocks.spawnSync.mockReturnValue({ status: 0 });

    const result = runDockerCommand("build", baseOptions, "/workspace");

    expect(result).toEqual({ success: true });
    const [command, args, spawnOptions] =
      childProcessMocks.spawnSync.mock.calls[0];
    expect(command).toBe("docker");
    expect(spawnOptions).toMatchObject({ cwd: "/workspace" });
    expect(args).toEqual(
      expect.arrayContaining([
        ".",
        "--file",
        "apps/my-app/Dockerfile",
        "--tag",
        "apps-my-app",
        "--tag",
        "ghcr.io/pagopa/dx/my-app:dev",
      ]),
    );
    expect(args).not.toContain("--push");
    expect(githubSummaryMocks.summarizeDockerPush).not.toHaveBeenCalled();
  });

  it("uses context and Dockerfile paths configured for a project", () => {
    dockerImageMocks.computeImageTags.mockReturnValue([]);
    dockerImageMocks.getProjectSlug.mockReturnValue("apps-my-app");
    childProcessMocks.execFileSync.mockReturnValue("abc1234\n");
    childProcessMocks.spawnSync.mockReturnValue({ status: 0 });

    runDockerCommand(
      "build",
      {
        ...baseOptions,
        contextPath: "apps/my-app",
        dockerfilePath: "apps/my-app/docker/Dockerfile.release",
      },
      "/workspace",
    );

    const [, args, spawnOptions] = childProcessMocks.spawnSync.mock.calls[0];
    expect(args).toEqual(
      expect.arrayContaining([
        "apps/my-app",
        "--file",
        "apps/my-app/docker/Dockerfile.release",
      ]),
    );
    expect(spawnOptions).toMatchObject({ cwd: "/workspace" });
  });

  it("pushes every computed tag with index+manifest annotations", () => {
    dockerImageMocks.computeImageTags.mockReturnValue(["main", "latest"]);
    childProcessMocks.execFileSync.mockReturnValue("abc1234\n");
    childProcessMocks.spawnSync.mockReturnValue({ status: 0 });

    const result = runDockerCommand("push", baseOptions, "/workspace");

    expect(result).toEqual({ success: true });
    const [, args] = childProcessMocks.spawnSync.mock.calls[0];
    expect(args).toEqual(
      expect.arrayContaining([
        "--tag",
        "ghcr.io/pagopa/dx/my-app:main",
        "--tag",
        "ghcr.io/pagopa/dx/my-app:latest",
        "--push",
      ]),
    );
    expect(
      args.filter((arg: string) => arg === "--annotation").length,
    ).toBeGreaterThan(0);
    expect(githubSummaryMocks.summarizeDockerPush).toHaveBeenCalledWith(
      "my-app",
      "ghcr.io/pagopa/dx/my-app",
      ["main", "latest"],
    );
  });

  it("uses manifest annotations for a single-platform push", () => {
    dockerImageMocks.computeImageTags.mockReturnValue(["latest"]);
    childProcessMocks.execFileSync.mockReturnValue("abc1234\n");
    childProcessMocks.spawnSync.mockReturnValue({ status: 0 });

    runDockerCommand(
      "push",
      { ...baseOptions, platform: "linux/amd64" },
      "/workspace",
    );

    const [, args] = childProcessMocks.spawnSync.mock.calls[0];
    expect(args).toContain("manifest:org.opencontainers.image.title=my-app");
    expect(args).not.toContain(
      "index,manifest:org.opencontainers.image.title=my-app",
    );
  });

  it("reports a failure and returns success: false when docker exits non-zero", () => {
    dockerImageMocks.computeImageTags.mockReturnValue(["main"]);
    childProcessMocks.execFileSync.mockReturnValue("abc1234\n");
    childProcessMocks.spawnSync.mockReturnValue({ status: 1 });

    const result = runDockerCommand("push", baseOptions, "/workspace");

    expect(result).toEqual({ success: false });
    expect(githubSummaryMocks.summarizeDockerFailure).toHaveBeenCalledWith(
      "my-app",
      "push",
      1,
    );
    expect(githubSummaryMocks.summarizeDockerPush).not.toHaveBeenCalled();
  });
});
