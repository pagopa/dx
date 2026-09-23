/**
 * Verifies the batched remote-state lookups used by the tag/release sync.
 * These replaced per-tag network probes, which made the step take minutes on
 * repositories with hundreds of tags.
 */
import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface ExecFileResult {
  stderr: string;
  stdout: string;
}

interface ReleaseItem {
  created_at: string;
  tag_name: string;
}

const { execFilePromiseMock } = vi.hoisted(() => ({
  execFilePromiseMock: vi.fn<
    (file: string, args: readonly string[]) => Promise<ExecFileResult>
  >(async () => ({ stderr: "", stdout: "" })),
}));

vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), {
    [promisify.custom]: execFilePromiseMock,
  }),
}));

import {
  getExistingReleaseTags,
  getRemoteTagNames,
} from "../sync-tags-releases.js";

/** Fake Octokit whose `listReleases` serves the provided pages by index. */
function mockListReleases(pages: ReleaseItem[][]) {
  const listReleases = vi.fn(
    async ({ page }: { page: number }): Promise<{ data: ReleaseItem[] }> => ({
      data: pages[page - 1] ?? [],
    }),
  );
  return { listReleases, octokit: { repos: { listReleases } } as never };
}

/** Builds a full page of releases sharing the same creation time. */
function pageOf(
  count: number,
  created_at: string,
  prefix: string,
): ReleaseItem[] {
  return Array.from({ length: count }, (_, i) => ({
    created_at,
    tag_name: `${prefix}@${i}`,
  }));
}

describe("getRemoteTagNames", () => {
  beforeEach(() => {
    execFilePromiseMock.mockReset();
  });

  it("parses tag names from a single ls-remote call", async () => {
    execFilePromiseMock.mockResolvedValue({
      stderr: "",
      stdout: [
        "1111111111111111111111111111111111111111\trefs/tags/docs@0.22.9",
        "2222222222222222222222222222222222222222\trefs/tags/@pagopa/dx-cli@0.27.9",
        "3333333333333333333333333333333333333333\trefs/tags/dx-metrics@0.5.19^{}",
        "",
      ].join("\n"),
    });

    const tags = await getRemoteTagNames();

    expect(tags).toEqual(
      new Set(["@pagopa/dx-cli@0.27.9", "docs@0.22.9", "dx-metrics@0.5.19"]),
    );
    expect(execFilePromiseMock).toHaveBeenCalledTimes(1);
    expect(execFilePromiseMock).toHaveBeenCalledWith("git", [
      "ls-remote",
      "--tags",
      "--refs",
      "origin",
    ]);
  });

  it("ignores non-tag refs and blank lines", async () => {
    execFilePromiseMock.mockResolvedValue({
      stderr: "",
      stdout: "\n0000\trefs/heads/main\n1111\trefs/tags/docs@1.0.0\n",
    });

    await expect(getRemoteTagNames()).resolves.toEqual(new Set(["docs@1.0.0"]));
  });
});

describe("getExistingReleaseTags", () => {
  it("requests 100 releases per page", async () => {
    const { listReleases, octokit } = mockListReleases([[]]);

    await getExistingReleaseTags(
      octokit,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(listReleases).toHaveBeenCalledWith({
      owner: "pagopa",
      page: 1,
      per_page: 100,
      repo: "dx",
    });
  });

  it("returns an empty set when the repository has no releases", async () => {
    const { listReleases, octokit } = mockListReleases([[]]);

    const tags = await getExistingReleaseTags(
      octokit,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(tags.size).toBe(0);
    expect(listReleases).toHaveBeenCalledTimes(1);
  });

  it("stops as soon as every candidate tag has been found", async () => {
    const { listReleases, octokit } = mockListReleases([
      [
        { created_at: "2026-01-10T00:00:00Z", tag_name: "docs@1.0.0" },
        ...pageOf(99, "2026-01-10T00:00:00Z", "pkg"),
      ],
      pageOf(100, "2020-01-01T00:00:00Z", "old"),
    ]);

    const tags = await getExistingReleaseTags(
      octokit,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(tags.has("docs@1.0.0")).toBe(true);
    expect(listReleases).toHaveBeenCalledTimes(1);
  });

  it("stops at the recovery-window cutoff when candidates are missing", async () => {
    const { listReleases, octokit } = mockListReleases([
      pageOf(100, "2020-01-01T00:00:00Z", "pkg"),
      pageOf(100, "2019-01-01T00:00:00Z", "older"),
    ]);

    const tags = await getExistingReleaseTags(
      octokit,
      "pagopa",
      "dx",
      new Set(["missing@1.0.0"]),
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(tags.has("missing@1.0.0")).toBe(false);
    expect(listReleases).toHaveBeenCalledTimes(1);
  });

  it("walks pages until the candidate tags are found", async () => {
    const { listReleases, octokit } = mockListReleases([
      pageOf(100, "2026-01-10T00:00:00Z", "a"),
      [{ created_at: "2026-01-09T00:00:00Z", tag_name: "docs@1.0.0" }],
    ]);

    const tags = await getExistingReleaseTags(
      octokit,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(tags.has("docs@1.0.0")).toBe(true);
    expect(listReleases).toHaveBeenCalledTimes(2);
  });
});
