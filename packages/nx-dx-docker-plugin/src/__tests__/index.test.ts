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

import type { DockerPluginOptions } from "../options.ts";

import { getBuildLayoutOverrides } from "../docker-build-layout.ts";
import { buildDockerPushTarget } from "../docker-targets.ts";
import { createDockerReleaseNodes } from "../index.ts";

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

describe("createDockerReleaseNodes", () => {
  it("infers docker:run without the Nx Docker release technology", () => {
    vi.mocked(readJsonFile).mockReturnValue({});

    const options: DockerPluginOptions = {
      buildTargetName: "docker:build",
      defaultBranch: "main",
      imageAuthors: "PagoPA",
      imageNamePrefix: "pagopa/dx",
      imageUrl: "https://github.com/pagopa/dx",
      platform: "linux/amd64",
      pushTargetName: "docker:push",
      registry: "ghcr.io",
    };

    const nodes = createDockerReleaseNodes("apps/my-app", options, {
      workspaceRoot: "/workspace",
    });

    expect(
      nodes.projects["apps/my-app"].targets?.["docker:build"]?.metadata,
    ).toMatchObject({ technologies: ["container-image"] });

    expect(
      nodes.projects["apps/my-app"].targets?.["docker:push"]?.metadata,
    ).toMatchObject({ technologies: ["container-image"] });

    expect(nodes.projects["apps/my-app"].targets?.["docker:run"]).toMatchObject(
      {
        command: "docker run {args} apps-my-app",
        dependsOn: ["docker:build"],
        metadata: {
          technologies: ["container-image"],
        },
      },
    );
  });

  it("infers the Docker release publisher without duplicating build options", () => {
    vi.mocked(readJsonFile).mockReturnValue({
      release: {
        docker: {
          repositoryName: "pagopa/my-app",
        },
      },
    });

    const nodes = createDockerReleaseNodes(
      "apps/my-app",
      {
        buildTargetName: "docker:build",
        defaultBranch: "main",
        imageAuthors: "PagoPA",
        imageNamePrefix: "pagopa/dx",
        imageUrl: "https://github.com/pagopa/dx",
        platform: "linux/amd64",
        pushTargetName: "docker:push",
        registry: "ghcr.io",
      },
      {
        workspaceRoot: "/workspace",
      },
    );

    expect(
      nodes.projects["apps/my-app"].targets?.["nx-release-publish"],
    ).toMatchObject({
      continuous: false,
      executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      metadata: {
        technologies: ["container-image"],
      },
    });
    expect(
      nodes.projects["apps/my-app"].targets?.["nx-release-publish"]?.options,
    ).toBeUndefined();
  });
});
