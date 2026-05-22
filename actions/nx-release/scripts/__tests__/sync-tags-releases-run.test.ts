import { promisify } from "node:util";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createReleaseMock,
  execFilePromiseMock,
  extractTagEntriesFromPRBodyMock,
  getReleaseByTagMock,
  listPullsMock,
} = vi.hoisted(() => ({
  createReleaseMock: vi.fn(async () => undefined),
  execFilePromiseMock: vi.fn(async () => ({ stderr: "", stdout: "" })),
  extractTagEntriesFromPRBodyMock: vi.fn(),
  getReleaseByTagMock: vi.fn(),
  listPullsMock: vi.fn(async () => ({ data: [] })),
}));

vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), {
    [promisify.custom]: execFilePromiseMock,
  }),
}));

vi.mock("../shared.js", () => ({
  createOctokit: () => ({
    pulls: {
      list: listPullsMock,
    },
    repos: {
      createRelease: createReleaseMock,
      getReleaseByTag: getReleaseByTagMock,
    },
  }),
  extractTagEntriesFromPRBody: extractTagEntriesFromPRBodyMock,
  getRepoInfo: async () => ({ owner: "pagopa", repo: "dx" }),
}));

import { run } from "../sync-tags-releases.js";

describe("run", () => {
  beforeEach(() => {
    createReleaseMock.mockClear();
    execFilePromiseMock.mockReset();
    extractTagEntriesFromPRBodyMock.mockReset();
    getReleaseByTagMock.mockReset();
    listPullsMock.mockClear();
  });

  it("creates a missing GitHub release even when the tag already exists remotely", async () => {
    listPullsMock.mockResolvedValue({
      data: [
        {
          body: "<!-- nx-release-tags: [] -->",
          merge_at: "2026-05-21T00:00:00Z",
          merge_commit_sha: "abcdef0123456789",
          merged_at: "2026-05-21T00:00:00Z",
          number: 1781,
        },
      ],
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([
      {
        path: null,
        tag: "@pagopa/azure-tracing@0.4.17",
        version: "0.4.17",
      },
    ]);

    execFilePromiseMock.mockImplementation(
      async (file: string, args: readonly string[]) => {
        if (
          file === "git" &&
          args[0] === "ls-remote" &&
          args[1] === "--tags"
        ) {
          return {
            stderr: "",
            stdout: "abcdef0123456789\trefs/tags/@pagopa/azure-tracing@0.4.17\n",
          };
        }

        return { stderr: "", stdout: "" };
      },
    );

    getReleaseByTagMock.mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );

    await run("main");

    expect(createReleaseMock).toHaveBeenCalledWith({
      body: "Release @pagopa/azure-tracing@0.4.17",
      name: "@pagopa/azure-tracing@0.4.17",
      owner: "pagopa",
      prerelease: false,
      repo: "dx",
      tag_name: "@pagopa/azure-tracing@0.4.17",
    });
    expect(execFilePromiseMock).not.toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["push", "origin", "--tags"]),
    );
  });
});