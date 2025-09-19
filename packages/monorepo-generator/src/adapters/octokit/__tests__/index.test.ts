import { err, ok } from "neverthrow";
import { type Octokit } from "octokit";
import { SemVer } from "semver";
import { beforeEach, describe, expect, it } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { fetchLatestRelease, fetchLatestTag } from "../index.js";

describe("octokit adapter", () => {
  const owner = "test-owner";
  const repo = "test-repo";
  const client = mockDeep<Octokit>();

  beforeEach(() => {
    mockReset(client);
  });

  describe("fetchLatestTag", () => {
    it("should return the highest valid semver tag", async () => {
      client.request.mockResolvedValueOnce({
        data: [
          { name: "v1.0.0" },
          { name: "2.0.0-beta.1" },
          { name: "2.0.0" },
          { name: "not-a-version" },
        ],
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(ok(new SemVer("2.0.0")));

      expect(client.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}/tags",
        { owner, repo },
      );
    });

    it("returns null if there are no valid semver tags", async () => {
      client.request.mockResolvedValueOnce({
        data: [{ name: "foo" }, { name: "bar" }],
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(ok(null));
    });

    it("should return an error when client promise fails", async () => {
      client.request.mockRejectedValueOnce(new Error("an error"));

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(
        err(new Error("Failed to fetch tags for test-owner/test-repo")),
      );
    });
  });

  describe("fetchLatestRelease", () => {
    it("should return parsed semver for the latest release tag", async () => {
      client.request.mockResolvedValueOnce({
        data: { tag_name: "v1.2.3" },
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestRelease({ client, owner, repo });
      expect(result).toStrictEqual(ok(new SemVer("v1.2.3")));

      expect(client.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}/releases/latest",
        { owner, repo },
      );
    });
  });
});
