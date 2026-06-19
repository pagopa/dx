/**
 * Tests for isNonInteractive, resolveOutputMode and the createCommandPresenter
 * factory.
 */
import { describe, expect, it } from "vitest";

import {
  createCommandPresenter,
  isNonInteractive,
  resolveOutputMode,
} from "../index.js";
import { JsonCommandPresenter } from "../json-command-presenter.js";
import { TextCommandPresenter } from "../text-command-presenter.js";

describe("isNonInteractive", () => {
  it("returns true when CI is true", () => {
    expect(isNonInteractive({ CI: true })).toBe(true);
  });

  it("returns false when CI is false", () => {
    expect(isNonInteractive({ CI: false })).toBe(false);
  });
});

describe("resolveOutputMode", () => {
  it("forces json when running non-interactively, ignoring --output", () => {
    expect(resolveOutputMode({ CI: true }, "text")).toBe("json");
    expect(resolveOutputMode({ CI: true }, undefined)).toBe("json");
  });

  it("follows the --output flag when interactive", () => {
    expect(resolveOutputMode({ CI: false }, "json")).toBe("json");
    expect(resolveOutputMode({ CI: false }, "text")).toBe("text");
  });

  it("defaults to text when nothing is provided", () => {
    expect(resolveOutputMode({ CI: false }, undefined)).toBe("text");
  });
});

describe("createCommandPresenter", () => {
  it("returns a TextCommandPresenter when output is 'text'", () => {
    expect(createCommandPresenter("text")).toBeInstanceOf(TextCommandPresenter);
  });

  it("returns a JsonCommandPresenter when output is 'json'", () => {
    expect(createCommandPresenter("json")).toBeInstanceOf(JsonCommandPresenter);
  });
});
