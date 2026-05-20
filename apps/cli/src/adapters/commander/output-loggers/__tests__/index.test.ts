/**
 * Tests for isNonInteractive and createCommandPresenter factory.
 */
import { describe, expect, it } from "vitest";

import { createCommandPresenter, isNonInteractive } from "../index.js";
import { JsonCommandPresenter } from "../json-command-presenter.js";
import { TextCommandPresenter } from "../text-command-presenter.js";

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

describe("createCommandPresenter", () => {
  it("returns a TextCommandPresenter when output is 'text'", () => {
    expect(createCommandPresenter("text")).toBeInstanceOf(TextCommandPresenter);
  });

  it("returns a JsonCommandPresenter when output is 'json'", () => {
    expect(createCommandPresenter("json")).toBeInstanceOf(JsonCommandPresenter);
  });
});
