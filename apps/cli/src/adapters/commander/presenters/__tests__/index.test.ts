/**
 * Tests for isNonInteractive and createCommandPresenter factory.
 */
import { describe, expect, it } from "vitest";

import { createCommandPresenter, isNonInteractive } from "../index.js";
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

describe("createCommandPresenter", () => {
  it("returns a TextCommandPresenter when output is 'text'", () => {
    expect(createCommandPresenter("text")).toBeInstanceOf(TextCommandPresenter);
  });

  it("returns a JsonCommandPresenter when output is 'json'", () => {
    expect(createCommandPresenter("json")).toBeInstanceOf(JsonCommandPresenter);
  });
});
