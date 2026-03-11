// Tests for the shared validatePrompt helper.
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { validatePrompt } from "../validate-prompt.js";

describe("validatePrompt", () => {
  it("returns true when input is valid", () => {
    const schema = z.string().min(1, "Must not be empty");
    const validate = validatePrompt(schema);

    const result = validate("hello");

    expect(result).toBe(true);
  });

  it("returns a string error message when input is invalid", () => {
    const schema = z.string().min(1, "Must not be empty");
    const validate = validatePrompt(schema);

    const result = validate("");

    expect(typeof result).toBe("string");
    expect(result).not.toBe(true);
  });

  it("returns the pretty-printed zod error message", () => {
    const schema = z.string().min(3, "Too short");
    const validate = validatePrompt(schema);

    const result = validate("ab");

    expect(result).toContain("Too short");
  });

  it("returns true for input that passes a min/max length schema", () => {
    const schema = z.string().min(2).max(4);
    const validate = validatePrompt(schema);

    expect(validate("ab")).toBe(true);
    expect(validate("abc")).toBe(true);
    expect(validate("abcd")).toBe(true);
  });

  it("returns error string when input is too short for min/max length schema", () => {
    const schema = z.string().min(2).max(4);
    const validate = validatePrompt(schema);

    const result = validate("a");

    expect(typeof result).toBe("string");
  });

  it("returns error string when input is too long for min/max length schema", () => {
    const schema = z.string().min(2).max(4);
    const validate = validatePrompt(schema);

    const result = validate("abcde");

    expect(typeof result).toBe("string");
  });

  it("validates input after schema transforms are applied", () => {
    // Schema with trim+toLowerCase then min length check
    const schema = z.string().trim().toLowerCase().min(2);
    const validate = validatePrompt(schema);

    // "  A  " after trim is "A", after toLowerCase is "a" → length 1 → fails min(2)
    const result = validate("  A  ");

    expect(typeof result).toBe("string");
  });

  it("works with a non-string schema", () => {
    const schema = z.array(z.string()).min(1, "Select at least one item");
    const validate = validatePrompt(schema);

    expect(validate(["item1"])).toBe(true);
    const result = validate([]);
    expect(typeof result).toBe("string");
    expect(result).toContain("Select at least one item");
  });
});
