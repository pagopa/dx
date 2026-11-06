/**
 * Checks ownership lookups against realistic HTTP responses at the API boundary.
 */
import { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";

import { OctokitGitHubService } from "../index.js";

const makeService = (data: unknown, status = 200) => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
      status,
    }),
  );
  return new OctokitGitHubService(
    new Octokit({ request: { fetch, retries: 0 } }),
  );
};

describe("GitHub ownership lookup", () => {
  it.each(["User", "Organization"])(
    "classifies a %s account and keeps canonical login",
    async (type) => {
      const service = makeService({ login: "Canonical", type });
      await expect(service.getAccount("canonical")).resolves.toEqual({
        login: "Canonical",
        type,
      });
    },
  );

  it("returns canonical team slug and visibility", async () => {
    await expect(
      makeService({ privacy: "closed", slug: "product-team" }).getTeam(
        "pagopa",
        "Product-Team",
      ),
    ).resolves.toEqual({ privacy: "closed", slug: "product-team" });
  });

  it.each([401, 403, 404, 429])(
    "reports an actionable HTTP %s account error",
    async (status) => {
      await expect(
        makeService({ message: "Lookup failed" }, status).getAccount("alice"),
      ).rejects.toThrow(
        `Cannot validate GitHub account @alice. GitHub returned HTTP ${status}`,
      );
    },
  );

  it.each([403, 404, 429])(
    "reports a missing or inaccessible team (HTTP %s)",
    async (status) => {
      await expect(
        makeService({ message: "Lookup failed" }, status).getTeam(
          "pagopa",
          "product-team",
        ),
      ).rejects.toThrow("organization access/read:org");
    },
  );

  it("rejects malformed account data", async () => {
    await expect(
      makeService({ login: "alice" }).getAccount("alice"),
    ).rejects.toThrow("unsupported account");
  });

  it("rejects malformed team data", async () => {
    await expect(
      makeService({ slug: "team" }).getTeam("pagopa", "team"),
    ).rejects.toThrow("unsupported team");
  });

  it("does not silently accept bots as human code owners", async () => {
    await expect(
      makeService({ login: "robot", type: "Bot" }).getAccount("robot"),
    ).rejects.toThrow("unsupported account");
  });

  it("preserves network failures with retry guidance", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new Error("Network unavailable"));
    const service = new OctokitGitHubService(
      new Octokit({ request: { fetch, retries: 0 } }),
    );
    await expect(service.getTeam("pagopa", "team")).rejects.toThrow(
      "Cannot validate GitHub team @pagopa/team",
    );
  });
});
