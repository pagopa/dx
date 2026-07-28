import { readJsonFile } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystemMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: fileSystemMocks.existsSync,
}));

vi.mock("@nx/devkit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@nx/devkit")>()),
  readJsonFile: vi.fn(),
}));

import { getBuildLayoutOverrides } from "../docker-build-layout.ts";
import { buildDockerPushTarget } from "../docker-targets.ts";

describe("getBuildLayoutOverrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystemMocks.existsSync.mockReturnValue(true);
  });

  it("reads the Docker platform override from the project package", () => {
    vi.mocked(readJsonFile).mockReturnValue({
      nx: {
        docker: {
          contextPath: "apps/my-app",
          dockerfilePath: "apps/my-app/docker/Dockerfile.release",
          platform: "linux/amd64",
        },
      },
    });

    expect(getBuildLayoutOverrides("/workspace", "apps/my-app")).toEqual({
      contextPath: "apps/my-app",
      dockerfilePath: "apps/my-app/docker/Dockerfile.release",
      platform: "linux/amd64",
    });
  });

  it("leaves platform undefined when the project uses the plugin default", () => {
    vi.mocked(readJsonFile).mockReturnValue({ nx: {} });

    expect(getBuildLayoutOverrides("/workspace", "apps/my-app")).toEqual({
      contextPath: ".",
      dockerfilePath: "apps/my-app/Dockerfile",
      platform: undefined,
    });
  });

  it("reads Docker layout overrides from project metadata without package.json", () => {
    fileSystemMocks.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    vi.mocked(readJsonFile).mockReturnValue({
      metadata: {
        docker: {
          contextPath: "containers/runner",
          platform: "linux/amd64",
        },
      },
    });

    expect(getBuildLayoutOverrides("/workspace", "containers/runner")).toEqual({
      contextPath: "containers/runner",
      dockerfilePath: "containers/runner/Dockerfile",
      platform: "linux/amd64",
    });
  });
});

describe("buildDockerPushTarget", () => {
  it("preserves project context, Dockerfile, and platform overrides", () => {
    const options = {
      contextPath: "apps/my-app",
      defaultBranch: "main",
      dockerfilePath: "apps/my-app/docker/Dockerfile.release",
      imageAuthors: "PagoPA",
      imageName: "ghcr.io/pagopa/dx/my-app",
      imageUrl: "https://github.com/pagopa/dx",
      platform: "linux/amd64",
      projectDisplayName: "my-app",
      projectRoot: "apps/my-app",
    };

    const target = buildDockerPushTarget(options, "docker:build");

    expect(target.options).toEqual(options);
  });
});
