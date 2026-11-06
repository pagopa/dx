/**
 * Manual authorization guidance must not imply that code ownership grants access.
 */
import { describe, expect, it } from "vitest";

import type { CodeOwnership } from "../../../../domain/code-ownership.js";

import { getOwnershipGuidance } from "../init.js";

const guidance = (repoOwner: string, ownership: CodeOwnership) =>
  getOwnershipGuidance({ ownership, repoName: "project", repoOwner });

describe("ownership authorization guidance", () => {
  it("names the exact PagoPA teams in the manual authorization PR instructions", () => {
    const result = guidance("pagopa", {
      namespaceType: "Organization",
      owners: ["@pagopa/product-team", "@alice", "@pagopa/platform-team"],
      reviewerTeams: ["product-team", "platform-team"],
    });
    expect(result.instructions.join("\n")).toContain(
      "grant @pagopa/product-team, @alice, @pagopa/platform-team",
    );
    expect(result.instructions.join("\n")).toContain(
      "product-team, platform-team",
    );
    expect(result.permissionStatus).toBe("manual-authorization-required");
  });

  it("does not assume other organizations have a GitHub authorization repository", () => {
    const result = guidance("another-org", {
      namespaceType: "Organization",
      owners: ["@another-org/team"],
      reviewerTeams: ["team"],
    });
    expect(result.authorizationRepository).toBeUndefined();
    expect(result.instructions.join("\n")).toContain(
      "another-org's authorization process",
    );
    expect(result.instructions.join("\n")).not.toContain(
      "eng-github-authorization",
    );
  });

  it("does not require an authorization PR for the inferred personal owner", () => {
    const result = guidance("alice", {
      namespaceType: "User",
      owners: ["@alice"],
      reviewerTeams: [],
    });
    expect(result.permissionStatus).toBe("personal-owner");
    expect(result.instructions.join("\n")).not.toContain("Open a PR");
  });

  it("explains how to grant additional personal collaborators access", () => {
    const result = guidance("alice", {
      namespaceType: "User",
      owners: ["@alice", "@bob"],
      reviewerTeams: [],
    });
    expect(result.instructions.join("\n")).toContain("Grant @bob Write access");
    expect(result.instructions.join("\n")).toContain(
      "accept collaborator invitations",
    );
    expect(result.authorizationRepository).toBeUndefined();
  });
});
