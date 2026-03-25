import { describe, expect, it } from "vitest";

import { matchProjectName } from "../shared.js";

const NX_NAMES = ["@dx/app-x", "@dx/app-y", "@dx/app-zs", "it.pagopa.dx:app-x"];

describe("matchProjectName", () => {
  it("matches a full scoped name with @ separator", () => {
    expect(matchProjectName("@dx/app-x@1.1.0-rc.12", NX_NAMES)).toBe(
      "@dx/app-x",
    );
  });

  it("matches a full scoped name with / separator", () => {
    expect(matchProjectName("@dx/app-x/1.1.0", NX_NAMES)).toBe("@dx/app-x");
  });

  it("returns null when no project name matches", () => {
    expect(matchProjectName("@dx/unknown-svc@1.0.0", NX_NAMES)).toBeNull();
  });

  it("returns the longest match when multiple names share a prefix", () => {
    const names = ["@dx/app-x", "@dx/app-x-extra"];
    expect(matchProjectName("@dx/app-x-extra@2.0.0", names)).toBe(
      "@dx/app-x-extra",
    );
  });

  it("does not match when the project name is only a substring (not a prefix)", () => {
    // "iam-ms" should not match "@dx/app-x@1.0.0"
    // because the tag does not START WITH "iam-ms"
    expect(matchProjectName("@dx/app-x@1.0.0", ["iam-ms"])).toBeNull();
  });

  it("matches a Maven-style project name with : separator", () => {
    expect(matchProjectName("it.pagopa.dx:app-x@1.0.0", NX_NAMES)).toBe(
      "it.pagopa.dx:app-x",
    );
  });

  it("does not match a project name that is a word-boundary false positive", () => {
    // "foo" should NOT match "foobar@1.0.0" because charAfter is 'b' (word char)
    expect(matchProjectName("foobar@1.0.0", ["foo"])).toBeNull();
  });
});
