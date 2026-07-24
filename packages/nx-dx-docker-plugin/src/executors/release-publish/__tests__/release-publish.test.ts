/** Verifies Docker release publishing derives tags from the released package. */
import { afterEach, describe, expect, it, vi } from "vitest";

const dockerRunMocks = vi.hoisted(() => ({
  runDockerCommand: vi.fn(() => ({ success: true })),
}));

const dockerImageMocks = vi.hoisted(() => ({
  computeReleaseTags: vi.fn(() => ["1.2.3", "1.2", "1", "latest"]),
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(() => Promise.resolve('{"version":"1.2.3"}')),
}));

vi.mock("../../../docker-run.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../docker-run.ts")>()),
  ...dockerRunMocks,
}));
vi.mock("../../../docker-image.ts", () => dockerImageMocks);
vi.mock("node:fs/promises", () => fsMocks);

import {
  type DockerPublishExecutorContext,
  releasePublishExecutor,
} from "../release-publish.ts";

const createContext = (): DockerPublishExecutorContext => ({
  root: "/workspace",
});

const createOptions = () => ({
  contextPath: ".",
  defaultBranch: "main",
  dockerfilePath: "apps/sample/Dockerfile",
  imageAuthors: "PagoPA",
  imageName: "ghcr.io/pagopa/example",
  imageUrl: "https://github.com/pagopa/example",
  platform: "linux/amd64",
  projectDisplayName: "@pagopa/example",
  projectRoot: "apps/sample",
});

describe("release-publish executor", () => {
  afterEach(() => {
    dockerImageMocks.computeReleaseTags.mockClear();
    dockerImageMocks.computeReleaseTags.mockReturnValue([
      "1.2.3",
      "1.2",
      "1",
      "latest",
    ]);
    dockerRunMocks.runDockerCommand.mockClear();
    dockerRunMocks.runDockerCommand.mockReturnValue({ success: true });
    fsMocks.readFile.mockClear();
    fsMocks.readFile.mockResolvedValue('{"version":"1.2.3"}');
    delete process.env.NX_DRY_RUN;
  });

  it("builds and pushes tags derived from the released package version", async () => {
    await expect(
      releasePublishExecutor(createOptions(), createContext()),
    ).resolves.toEqual({ success: true });

    expect(fsMocks.readFile).toHaveBeenCalledWith(
      "/workspace/apps/sample/package.json",
      "utf8",
    );
    expect(dockerImageMocks.computeReleaseTags).toHaveBeenCalledWith(
      "@pagopa/example",
      "1.2.3",
    );
    expect(dockerRunMocks.runDockerCommand).toHaveBeenCalledWith(
      "push",
      createOptions(),
      "/workspace",
      "1.2.3",
    );
  });

  it("does not invoke Docker in dry run mode", async () => {
    process.env.NX_DRY_RUN = "true";

    await expect(
      releasePublishExecutor(createOptions(), createContext()),
    ).resolves.toEqual({ success: true });

    expect(dockerRunMocks.runDockerCommand).not.toHaveBeenCalled();
  });

  it("reads metadata.version from project.json when package.json is absent", async () => {
    fsMocks.readFile
      .mockRejectedValueOnce(
        Object.assign(new Error("missing"), { code: "ENOENT" }),
      )
      .mockResolvedValueOnce('{"metadata":{"version":"0.0.2"}}');

    await expect(
      releasePublishExecutor(createOptions(), createContext()),
    ).resolves.toEqual({ success: true });

    expect(fsMocks.readFile).toHaveBeenNthCalledWith(
      1,
      "/workspace/apps/sample/package.json",
      "utf8",
    );
    expect(fsMocks.readFile).toHaveBeenNthCalledWith(
      2,
      "/workspace/apps/sample/project.json",
      "utf8",
    );
    expect(dockerRunMocks.runDockerCommand).toHaveBeenCalledWith(
      "push",
      createOptions(),
      "/workspace",
      "0.0.2",
    );
  });

  it("rejects a package without a release version", async () => {
    fsMocks.readFile.mockResolvedValue("{}");

    await expect(
      releasePublishExecutor(createOptions(), createContext()),
    ).rejects.toThrow(
      "Could not read a version from /workspace/apps/sample/package.json.",
    );
  });

  it("rejects a version that cannot become a Docker tag", async () => {
    dockerImageMocks.computeReleaseTags.mockReturnValue([]);

    await expect(
      releasePublishExecutor(createOptions(), createContext()),
    ).rejects.toThrow(
      "Version '1.2.3' in apps/sample/package.json is not Docker-compatible semantic version.",
    );
    expect(dockerRunMocks.runDockerCommand).not.toHaveBeenCalled();
  });

  it("rejects invalid executor options", async () => {
    await expect(
      releasePublishExecutor({ projectRoot: "apps/sample" }, createContext()),
    ).rejects.toThrow("Invalid Docker publish executor options.");
  });
});
