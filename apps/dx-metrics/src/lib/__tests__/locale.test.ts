/** Tests for browser-locale resolution. */

import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE } from "@/lib/format";
import { resolveLocale } from "@/lib/locale";

describe("resolveLocale", () => {
  it("falls back to the default for empty input", () => {
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("canonicalises a valid browser tag", () => {
    expect(resolveLocale("it-IT")).toBe("it-IT");
    expect(resolveLocale("EN-us")).toBe("en-US");
  });

  it("falls back for a malformed tag instead of throwing", () => {
    expect(resolveLocale("not a locale")).toBe(DEFAULT_LOCALE);
  });
});
