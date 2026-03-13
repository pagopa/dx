import { describe, expect, it } from "vitest";

import { matchProjectName } from "../extract-tags.js";

// Realistic project names as returned by `nx show projects --json` in selfcare-monorepo-poc
const NX_NAMES = [
  "@dx/infra-dev-iam-ms",
  "@dx/infra-prod-iam-ms",
  "@dx/infra-dev-onboarding-ms",
  "it.pagopa.selfcare:iam-ms",
];

describe("matchProjectName", () => {
  it("matches a full scoped name with @ separator", () => {
    expect(matchProjectName("@dx/infra-dev-iam-ms@1.1.0-rc.12", NX_NAMES)).toBe(
      "@dx/infra-dev-iam-ms",
    );
  });

  it("matches a full scoped name with / separator", () => {
    expect(matchProjectName("@dx/infra-dev-iam-ms/1.1.0", NX_NAMES)).toBe(
      "@dx/infra-dev-iam-ms",
    );
  });

  it("returns null when no project name matches", () => {
    expect(matchProjectName("@dx/unknown-svc@1.0.0", NX_NAMES)).toBeNull();
  });

  it("returns the longest match when multiple names share a prefix", () => {
    const names = ["@dx/infra-dev-iam-ms", "@dx/infra-dev-iam-ms-extra"];
    expect(matchProjectName("@dx/infra-dev-iam-ms-extra@2.0.0", names)).toBe(
      "@dx/infra-dev-iam-ms-extra",
    );
  });

  it("does not match when the project name is only a substring (not a prefix)", () => {
    // "iam-ms" should not match "@dx/infra-dev-iam-ms@1.0.0"
    // because the tag does not START WITH "iam-ms"
    expect(
      matchProjectName("@dx/infra-dev-iam-ms@1.0.0", ["iam-ms"]),
    ).toBeNull();
  });

  it("matches a Maven-style project name with : separator", () => {
    expect(matchProjectName("it.pagopa.selfcare:iam-ms@1.0.0", NX_NAMES)).toBe(
      "it.pagopa.selfcare:iam-ms",
    );
  });

  it("does not match a project name that is a word-boundary false positive", () => {
    // "foo" should NOT match "foobar@1.0.0" because charAfter is 'b' (word char)
    expect(matchProjectName("foobar@1.0.0", ["foo"])).toBeNull();
  });
});
