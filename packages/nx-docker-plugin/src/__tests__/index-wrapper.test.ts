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
  getDockerBuildContext: vi.fn(() => "."),
  getDockerfileArgument: vi.fn(() => "apps/api/Dockerfile"),
}));

vi.mock("@nx/docker", () => ({
  createNodesV2: ["**/Dockerfile", dockerMocks.baseCreateNodes],
}));

vi.mock("../metadata.ts", () => ({
  getAutomaticDockerLabelArgs: dockerMocks.getAutomaticDockerLabelArgs,
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
                  options: {
                    args: [
                      "--file old/Dockerfile",
                      '--label org.opencontainers.image.title="old"',
                      "--provenance=false",
                      "--platform linux/amd64",
                    ],
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
      });
    expect(result[0]?.[1].projects?.["apps/api"]?.targets?.["nx-release-publish"])
      .toEqual({
        executor: "@pagopa/nx-docker-plugin:release-publish",
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
        executor: "@pagopa/nx-docker-plugin:release-publish",
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

    await createNodesV2[1](
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
      "PagoPA",
    );
  });
});