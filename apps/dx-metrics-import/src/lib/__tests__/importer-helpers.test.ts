/** Tests for the shared importer helpers. */

import { describe, expect, it } from "vitest";

import { errorStatus } from "../importer-helpers";

describe("errorStatus", () => {
  it("reads the numeric status from an Octokit-style error", () => {
    expect(errorStatus({ status: 404 })).toBe(404);
  });

  it("returns undefined when the error carries no numeric status", () => {
    expect(errorStatus(new Error("boom"))).toBeUndefined();
    expect(errorStatus({ status: "404" })).toBeUndefined();
    expect(errorStatus(null)).toBeUndefined();
    expect(errorStatus(undefined)).toBeUndefined();
    expect(errorStatus("error")).toBeUndefined();
  });
});
