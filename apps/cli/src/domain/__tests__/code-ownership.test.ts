/**
 * Ownership validation without repository access grants or cloud provisioning.
 */
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import type { GitHubService } from "../github.js";

import { codeOwnerSchema, resolveCodeOwnership } from "../code-ownership.js";

const organization = { login: "pagopa", type: "Organization" } as const;
const personal = { login: "alice", type: "User" } as const;

describe("code-owner syntax", () => {
  it.each([
    "",
    " ",
    "alice",
    "@",
    "@org/",
    "@org/team/other",
    "@-alice",
    "@alice-",
    "@a--b",
    "@a_b",
    "@org/team\n* @attacker",
    '@org/team"bad',
    "@org/${bad}",
    `@${"a".repeat(40)}`,
  ])("rejects malformed or blank reference %j", (reference) => {
    expect(codeOwnerSchema.safeParse(reference).success).toBe(false);
  });

  it.each(["@alice", "@a-b", "@pagopa/product-team"])(
    "accepts %s",
    (reference) => {
      expect(codeOwnerSchema.safeParse(reference).success).toBe(true);
    },
  );
});

describe("resolveCodeOwnership", () => {
  it("resolves canonical owners and deduplicates users and team slugs", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue(personal);
    github.getTeam.mockResolvedValue({
      privacy: "closed",
      slug: "product-team",
    });

    await expect(
      resolveCodeOwnership(
        organization,
        ["@ALICE", "@alice", "@PAGOPA/Product-Team", "@pagopa/product-team"],
        github,
      ),
    ).resolves.toEqual({
      namespaceType: "Organization",
      owners: ["@alice", "@pagopa/product-team"],
      reviewerTeams: ["product-team"],
    });
    expect(github.getAccount).toHaveBeenCalledExactlyOnceWith("ALICE");
    expect(github.getTeam).toHaveBeenCalledExactlyOnceWith(
      "pagopa",
      "Product-Team",
    );
  });

  it("includes a personal namespace owner without requiring flags or extra API calls", async () => {
    const github = mock<GitHubService>();
    await expect(resolveCodeOwnership(personal, [], github)).resolves.toEqual({
      namespaceType: "User",
      owners: ["@alice"],
      reviewerTeams: [],
    });
    expect(github.getAccount).not.toHaveBeenCalled();
  });

  it("keeps all personal owners on the same ownership list", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue({ login: "bob", type: "User" });
    await expect(
      resolveCodeOwnership(personal, ["@ALICE", "@bob"], github),
    ).resolves.toMatchObject({
      owners: ["@alice", "@bob"],
      reviewerTeams: [],
    });
    expect(github.getAccount).toHaveBeenCalledExactlyOnceWith("bob");
  });

  it("requires an explicit owner for an organization", async () => {
    await expect(
      resolveCodeOwnership(organization, [], mock<GitHubService>()),
    ).rejects.toThrow("require at least one code owner");
  });

  it("rejects explicit blank values even for personal repositories", async () => {
    await expect(
      resolveCodeOwnership(personal, [" "], mock<GitHubService>()),
    ).rejects.toThrow("blank values are not allowed");
  });

  it("does not accept an organization as an individual owner", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue(organization);
    await expect(
      resolveCodeOwnership(organization, ["@pagopa"], github),
    ).rejects.toThrow("not an individual code owner");
  });

  it.each([organization, personal])(
    "rejects teams outside the repository organization ($type)",
    async (namespace) => {
      const github = mock<GitHubService>();
      await expect(
        resolveCodeOwnership(namespace, ["@another-org/team"], github),
      ).rejects.toThrow("must be a team in the repository organization");
      expect(github.getTeam).not.toHaveBeenCalled();
    },
  );

  it("rejects secret teams", async () => {
    const github = mock<GitHubService>();
    github.getTeam.mockResolvedValue({
      privacy: "secret",
      slug: "product-team",
    });
    await expect(
      resolveCodeOwnership(organization, ["@pagopa/product-team"], github),
    ).rejects.toThrow("Choose a visible team");
  });

  it("rejects nested teams that the existing deployment reviewer module cannot resolve", async () => {
    const github = mock<GitHubService>();
    github.getTeam.mockResolvedValue({
      parent: { slug: "parent-team" },
      privacy: "closed",
      slug: "child-team",
    });
    await expect(
      resolveCodeOwnership(organization, ["@pagopa/child-team"], github),
    ).rejects.toThrow("only resolves root teams");
  });

  it.each(["account", "team"])(
    "propagates %s validation failures instead of accepting unverifiable owners",
    async (kind) => {
      const github = mock<GitHubService>();
      const failure = new Error("Cannot validate: GitHub is unavailable");
      github.getAccount.mockRejectedValue(failure);
      github.getTeam.mockRejectedValue(failure);
      await expect(
        resolveCodeOwnership(
          organization,
          [kind === "account" ? "@alice" : "@pagopa/team"],
          github,
        ),
      ).rejects.toBe(failure);
    },
  );
});
