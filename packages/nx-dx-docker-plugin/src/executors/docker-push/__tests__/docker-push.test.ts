import type { ExecutorContext } from "@nx/devkit";

import { beforeEach, describe, expect, it, vi } from "vitest";

const dockerRunMocks = vi.hoisted(() => ({
  runDockerCommand: vi.fn(),
}));

vi.mock("../../../docker-run.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../docker-run.ts")>();
  return {
    ...actual,
    runDockerCommand: dockerRunMocks.runDockerCommand,
  };
});

import type { DockerPushExecutorInput } from "../schema.ts";

import executor from "../docker-push.ts";

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
  defaultBranch: "main",
  dockerfilePath: "apps/my-app/Dockerfile",
  imageAuthors: "PagoPA",
  imageName: "ghcr.io/pagopa/dx/my-app",
  imageUrl: "https://github.com/pagopa/dx",
  projectDisplayName: "my-app",
  projectRoot: "apps/my-app",
} satisfies DockerPushExecutorInput;

describe("docker-push executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to runDockerCommand in push mode, applying the platform default", async () => {
    dockerRunMocks.runDockerCommand.mockReturnValue({ success: true });

    const result = await executor(validOptions, baseContext);

    expect(result).toEqual({ success: true });
    expect(dockerRunMocks.runDockerCommand).toHaveBeenCalledWith(
      "push",
      {
        ...validOptions,
        contextPath: ".",
        platform: "linux/amd64,linux/arm64",
      },
      baseContext.root,
    );
  });

  it("fails without calling runDockerCommand when required options are missing", async () => {
    const options = {
      projectRoot: "apps/my-app",
    } satisfies DockerPushExecutorInput;

    const result = await executor(options, baseContext);

    expect(result).toEqual({ success: false });
    expect(dockerRunMocks.runDockerCommand).not.toHaveBeenCalled();
  });
});
