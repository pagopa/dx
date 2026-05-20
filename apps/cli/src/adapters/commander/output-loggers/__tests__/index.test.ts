/**
 * Tests for isNonInteractive and createOutputLogger factory.
 */
import { describe, expect, it } from "vitest";

import { createOutputLogger, isNonInteractive } from "../index.js";
import { JsonOutputLogger } from "../json.js";
import { TextOutputLogger } from "../text.js";

describe("isNonInteractive", () => {
  it("returns false when CI is not set", () => {
    expect(isNonInteractive({ CI: undefined })).toBe(false);
  });

  it("returns true when CI is set to any value", () => {
    expect(isNonInteractive({ CI: "true" })).toBe(true);
  });

  it("returns true when CI is 'false' (presence is the signal, not the value)", () => {
    expect(isNonInteractive({ CI: "false" })).toBe(true);
  });
});

describe("createOutputLogger", () => {
  it("returns a TextOutputLogger when output is 'text'", () => {
    expect(createOutputLogger("text")).toBeInstanceOf(TextOutputLogger);
  });

  it("returns a JsonOutputLogger when output is 'json'", () => {
    expect(createOutputLogger("json")).toBeInstanceOf(JsonOutputLogger);
  });
});
