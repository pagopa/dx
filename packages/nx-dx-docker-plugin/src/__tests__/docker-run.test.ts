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
  defaultBranch: "main",
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
        "--tag",
        "apps-my-app",
        "--tag",
        "ghcr.io/pagopa/dx/my-app:dev",
      ]),
    );
    expect(args).not.toContain("--push");
    expect(githubSummaryMocks.summarizeDockerPush).not.toHaveBeenCalled();
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
