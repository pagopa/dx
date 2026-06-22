/**
 * Covers wrapper-only branches without depending on the upstream Nx Docker plugin implementation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dockerMocks = vi.hoisted(() => ({
  baseCreateNodes: vi.fn(),
  getAutomaticDockerLabelArgs: vi.fn(() => [
    '--label org.opencontainers.image.title="demo"',
    "--provenance=false",
  ]),
  getDefaultDockerImageAuthors: vi.fn(() => "acme"),
  getDockerBuildContext: vi.fn(() => "."),
  getDockerfileArgument: vi.fn(() => "apps/api/Dockerfile"),
}));

vi.mock("@nx/docker", () => ({
  createNodesV2: ["**/Dockerfile", dockerMocks.baseCreateNodes],
}));

vi.mock("../metadata.ts", () => ({
  getAutomaticDockerLabelArgs: dockerMocks.getAutomaticDockerLabelArgs,
  getDefaultDockerImageAuthors: dockerMocks.getDefaultDockerImageAuthors,
}));

vi.mock("../discovery.ts", () => ({
  getDockerBuildContext: dockerMocks.getDockerBuildContext,
  getDockerfileArgument: dockerMocks.getDockerfileArgument,
}));

import { createNodesV2 } from "../index.ts";

describe("createNodesV2 wrapper branches", () => {
  beforeEach(() => {
    dockerMocks.baseCreateNodes.mockReset();
    dockerMocks.getAutomaticDockerLabelArgs.mockClear();
    dockerMocks.getDefaultDockerImageAuthors.mockClear();
    dockerMocks.getDockerBuildContext.mockClear();
    dockerMocks.getDockerfileArgument.mockClear();
  });

  it("passes through results unchanged when the upstream plugin returns no projects", async () => {
    const upstreamResult = [
      [
        "apps/api/Dockerfile",
        {
          metadata: {
            targetGroups: {},
          },
        },
      ],
    ] as const;

    dockerMocks.baseCreateNodes.mockResolvedValue(upstreamResult);

    await expect(
      createNodesV2[1](["apps/api/Dockerfile"], undefined, {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      }),
    ).resolves.toEqual(upstreamResult);
  });

  it("replaces previous file and OCI label args on a custom build target", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "apps/api/Dockerfile",
        {
          projects: {
            "apps/api": {
              root: "apps/api",
              targets: {
                "container:build": {
                  command: "docker build .",
                  options: {
                    args: [
                      "--file old/Dockerfile",
                      '--label org.opencontainers.image.title="old"',
                      "--provenance=false",
                      "--platform linux/amd64",
                    ],
                    env: {
                      CUSTOM_FLAG: "on",
                    },
                  },
                },
              },
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["apps/api/Dockerfile"],
      {
        buildTarget: {
          metadata: {
            labels: ["com.acme.tier=backend"],
            tags: ["type=sha"],
          },
          name: "container:build",
        },
        dockerImageAuthors: "Platform Team",
      },
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["container:build"]?.options)
      .toEqual({
        args: [
          "--platform linux/amd64",
          "--file apps/api/Dockerfile",
          '--label org.opencontainers.image.title="demo"',
          "--provenance=false",
        ],
        cwd: ".",
        env: {
          CUSTOM_FLAG: "on",
          DOCKER_BUILDKIT: "1",
        },
        metadata: {
          labels: ["com.acme.tier=backend"],
          tags: ["type=sha"],
        },
      });
    expect(
      result[0]?.[1].projects?.["apps/api"]?.targets?.["container:build"]?.executor,
    ).toBe("@pagopa/nx-dx-docker-plugin:build");
    expect(
      result[0]?.[1].projects?.["apps/api"]?.targets?.["container:build"],
    ).not.toHaveProperty("command");
    expect(dockerMocks.getAutomaticDockerLabelArgs).toHaveBeenCalledWith(
      "/workspace",
      "apps/api",
      "apps-api",
      "Platform Team",
    );
    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["nx-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["docker-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
  });

  it("drops non-array upstream args before injecting the normalized Docker arguments", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "apps/api/Dockerfile",
        {
          projects: {
            "apps/api": {
              root: "apps/api",
              targets: {
                "docker:build": {
                  options: {
                    args: "--broken",
                  },
                },
              },
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["apps/api/Dockerfile"],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["docker:build"]?.options)
      .toEqual({
        args: [
          "--file apps/api/Dockerfile",
          '--label org.opencontainers.image.title="demo"',
          "--provenance=false",
        ],
        cwd: ".",
        env: {
          DOCKER_BUILDKIT: "1",
        },
      });
    expect(
      result[0]?.[1].projects?.["apps/api"]?.targets?.["docker:build"]?.executor,
    ).toBe("@pagopa/nx-dx-docker-plugin:build");
  });

  it("preserves an explicit DOCKER_BUILDKIT value from the upstream target", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "apps/api/Dockerfile",
        {
          projects: {
            "apps/api": {
              root: "apps/api",
              targets: {
                "docker:build": {
                  options: {
                    env: {
                      DOCKER_BUILDKIT: "0",
                    },
                  },
                },
              },
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["apps/api/Dockerfile"],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["docker:build"]?.options)
      .toEqual({
        args: [
          "--file apps/api/Dockerfile",
          '--label org.opencontainers.image.title="demo"',
          "--provenance=false",
        ],
        cwd: ".",
        env: {
          DOCKER_BUILDKIT: "0",
        },
      });
  });

  it("normalizes runTarget before delegating upstream and leaves the inferred run target untouched", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "apps/api/Dockerfile",
        {
          projects: {
            "apps/api": {
              root: "apps/api",
              targets: {
                "container:run": {
                  options: {
                    command: "docker run {args} apps-api",
                    cwd: "apps/api",
                  },
                },
              },
            },
          },
        },
      ],
    ]);

    const context = {
      nxJsonConfiguration: {},
      workspaceRoot: "/workspace",
    };

    const result = await createNodesV2[1](
      ["apps/api/Dockerfile"],
      {
        runTarget: {
          args: ["--rm"],
        },
      },
      context,
    );

    expect(dockerMocks.baseCreateNodes).toHaveBeenCalledWith(
      ["apps/api/Dockerfile"],
      {
        buildTarget: undefined,
        runTarget: {
          args: ["--rm"],
          name: "docker:run",
        },
      },
      context,
    );
    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["container:run"])
      .toEqual({
        options: {
          command: "docker run {args} apps-api",
          cwd: "apps/api",
        },
      });
  });

  it("falls back to the Dockerfile directory when the upstream project root is omitted", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "libs/api-image/Dockerfile",
        {
          projects: {
            "libs/api-image": {
              targets: {},
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["libs/api-image/Dockerfile"],
      {
        buildTarget: {
          name: "container:build",
        },
      },
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(dockerMocks.getDockerBuildContext).not.toHaveBeenCalled();
    expect(result[0]?.[1].projects?.["libs/api-image"]?.targets?.["nx-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
    expect(result[0]?.[1].projects?.["libs/api-image"]?.targets?.["docker-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
  });

  it("preserves an existing non-Docker nx-release-publish target", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "apps/mcpserver/Dockerfile",
        {
          projects: {
            "apps/mcpserver": {
              root: "apps/mcpserver",
              targets: {
                "docker:build": {},
                "nx-release-publish": {
                  executor: "@nx/js:release-publish",
                  options: {
                    access: "public",
                  },
                },
              },
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["apps/mcpserver/Dockerfile"],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(result[0]?.[1].projects?.["apps/mcpserver"]?.targets?.["nx-release-publish"])
      .toEqual({
        executor: "@nx/js:release-publish",
        options: {
          access: "public",
        },
      });
    expect(result[0]?.[1].projects?.["apps/mcpserver"]?.targets?.["docker-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
    expect(result[0]?.[1].projects?.["apps/mcpserver"]?.targets?.["docker:build"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:build",
        options: {
          args: [
            "--file apps/api/Dockerfile",
            '--label org.opencontainers.image.title="demo"',
            "--provenance=false",
          ],
          cwd: ".",
          env: {
            DOCKER_BUILDKIT: "1",
          },
        },
      });
  });

  it("supports Dockerfiles owned by the workspace root", async () => {
    dockerMocks.baseCreateNodes.mockResolvedValue([
      [
        "Dockerfile",
        {
          projects: {
            ".": {
              root: ".",
              targets: {
                "docker:build": {},
              },
            },
          },
        },
      ],
    ]);

    const result = await createNodesV2[1](
      ["Dockerfile"],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot: "/workspace",
      },
    );

    expect(dockerMocks.getAutomaticDockerLabelArgs).toHaveBeenCalledWith(
      "/workspace",
      ".",
      "workspace",
      "acme",
    );
    expect(result[0]?.[1].projects?.["."]?.targets?.["docker-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      });
  });
});