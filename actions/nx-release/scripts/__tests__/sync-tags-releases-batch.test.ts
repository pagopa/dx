/**
 * Tests the batched remote-state lookups used by the tag/release sync.
 *
 * The `git ls-remote` parsing is tested as a pure function and the release
 * listing through an injected `ReleaseLister`, so no process or HTTP mocking is
 * needed.
 */
import { describe, expect, it } from "vitest";

import {
  getExistingReleaseTags,
  parseRemoteTagRefs,
  type ReleaseLister,
} from "../sync-tags-releases.js";

interface ReleaseItem {
  created_at: string;
  tag_name: string;
}

/** Records the pages requested and serves the provided pages by index. */
function fakeReleaseLister(pages: ReleaseItem[][]): {
  lister: ReleaseLister;
  requests: { owner: string; page: number; per_page: number; repo: string }[];
} {
  const requests: {
    owner: string;
    page: number;
    per_page: number;
    repo: string;
  }[] = [];
  const lister: ReleaseLister = {
    listReleases: async (params) => {
      requests.push(params);
      return { data: pages[params.page - 1] ?? [] };
    },
  };
  return { lister, requests };
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

describe("parseRemoteTagRefs", () => {
  it("returns tag names without the refs/tags prefix or peel suffix", () => {
    const stdout = [
      "1111111111111111111111111111111111111111\trefs/tags/docs@0.22.9",
      "2222222222222222222222222222222222222222\trefs/tags/@pagopa/dx-cli@0.27.9",
      "3333333333333333333333333333333333333333\trefs/tags/dx-metrics@0.5.19^{}",
      "",
    ].join("\n");

    expect(parseRemoteTagRefs(stdout)).toEqual(
      new Set(["@pagopa/dx-cli@0.27.9", "docs@0.22.9", "dx-metrics@0.5.19"]),
    );
  });

  it("ignores non-tag refs and blank lines", () => {
    const stdout = "\n0000\trefs/heads/main\n1111\trefs/tags/docs@1.0.0\n";

    expect(parseRemoteTagRefs(stdout)).toEqual(new Set(["docs@1.0.0"]));
  });
});

describe("getExistingReleaseTags", () => {
  it("lists 100 releases per page for the requested repository", async () => {
    const { lister, requests } = fakeReleaseLister([[]]);

    await getExistingReleaseTags(
      lister,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(requests[0]).toEqual({
      owner: "pagopa",
      page: 1,
      per_page: 100,
      repo: "dx",
    });
  });

  it("returns an empty set when the repository has no releases", async () => {
    const { lister, requests } = fakeReleaseLister([[]]);

    const tags = await getExistingReleaseTags(
      lister,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(tags.size).toBe(0);
    expect(requests).toHaveLength(1);
  });

  it("stops as soon as every candidate tag has been found", async () => {
    const { lister, requests } = fakeReleaseLister([
      [
        { created_at: "2026-01-10T00:00:00Z", tag_name: "docs@1.0.0" },
        ...pageOf(99, "2026-01-10T00:00:00Z", "pkg"),
      ],
      pageOf(100, "2020-01-01T00:00:00Z", "old"),
    ]);

    const tags = await getExistingReleaseTags(
      lister,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
    );

    expect(tags.has("docs@1.0.0")).toBe(true);
    expect(requests.map((r) => r.page)).toEqual([1]);
  });

  it("stops at the recovery-window cutoff when candidates are missing", async () => {
    const { lister, requests } = fakeReleaseLister([
      pageOf(100, "2020-01-01T00:00:00Z", "pkg"),
      pageOf(100, "2019-01-01T00:00:00Z", "older"),
    ]);

    const tags = await getExistingReleaseTags(
      lister,
      "pagopa",
      "dx",
      new Set(["missing@1.0.0"]),
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(tags.has("missing@1.0.0")).toBe(false);
    expect(requests.map((r) => r.page)).toEqual([1]);
  });

  it("walks pages until the candidate tags are found", async () => {
    const { lister, requests } = fakeReleaseLister([
      pageOf(100, "2026-01-10T00:00:00Z", "a"),
      [{ created_at: "2026-01-09T00:00:00Z", tag_name: "docs@1.0.0" }],
    ]);

    const tags = await getExistingReleaseTags(
      lister,
      "pagopa",
      "dx",
      new Set(["docs@1.0.0"]),
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(tags.has("docs@1.0.0")).toBe(true);
    expect(requests.map((r) => r.page)).toEqual([1, 2]);
  });
});
