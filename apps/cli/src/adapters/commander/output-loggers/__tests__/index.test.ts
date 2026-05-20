/**
 * Tests for isAgenticMode and createOutputLogger factory.
 */
import { describe, expect, it } from "vitest";

import { isAgenticMode } from "../index.js";

describe("isAgenticMode", () => {
  it("returns false when CI is not set and output is text", () => {
    expect(isAgenticMode({ CI: undefined }, "text")).toBe(false);
  });

  it("returns true when CI is set to any value", () => {
    expect(isAgenticMode({ CI: "true" }, "text")).toBe(true);
  });

  it("returns true when CI is 'false' (presence is the signal, not the value)", () => {
    expect(isAgenticMode({ CI: "false" }, "text")).toBe(true);
  });

  it("returns true when CI is '0'", () => {
    expect(isAgenticMode({ CI: "0" }, "text")).toBe(true);
  });

  it("returns true when output is json regardless of CI", () => {
    expect(isAgenticMode({ CI: undefined }, "json")).toBe(true);
  });

  it("returns true when both CI is set and output is json", () => {
    expect(isAgenticMode({ CI: "true" }, "json")).toBe(true);
  });
});
