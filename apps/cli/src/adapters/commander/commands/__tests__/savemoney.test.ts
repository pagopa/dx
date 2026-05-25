/**
 * Unit tests for the pure helper functions in the savemoney command.
 *
 * The full command action (Azure API calls, spinner) is not exercised here
 * because it requires live credentials. These tests cover the stateless
 * parsing helpers that can be validated without any I/O.
 */

import { InvalidArgumentError } from "commander";
import { describe, expect, it } from "vitest";

import { parseSourceOption, parseTagsOption } from "../savemoney.js";

describe("parseSourceOption", () => {
  it("accepts 'advisor'", () => {
    expect(parseSourceOption("advisor")).toBe("advisor");
  });

  it("accepts 'custom'", () => {
    expect(parseSourceOption("custom")).toBe("custom");
  });

  it("accepts 'all'", () => {
    expect(parseSourceOption("all")).toBe("all");
  });

  it("throws InvalidArgumentError for an unknown value", () => {
    expect(() => parseSourceOption("aws")).toThrow(InvalidArgumentError);
  });

  it("throws InvalidArgumentError for an empty string", () => {
    expect(() => parseSourceOption("")).toThrow(InvalidArgumentError);
  });
});

describe("parseTagsOption", () => {
  it("returns an empty Map when tagsOption is undefined", () => {
    expect(parseTagsOption(undefined)).toEqual(new Map());
  });

  it("returns an empty Map when tagsOption is an empty array", () => {
    expect(parseTagsOption([])).toEqual(new Map());
  });

  it("parses a single key=value pair", () => {
    expect(parseTagsOption(["env=dev"])).toEqual(new Map([["env", "dev"]]));
  });

  it("parses multiple key=value pairs", () => {
    expect(parseTagsOption(["env=dev", "team=platform"])).toEqual(
      new Map([
        ["env", "dev"],
        ["team", "platform"],
      ]),
    );
  });

  it("handles values that contain '='", () => {
    expect(parseTagsOption(["url=https://example.com/path=1"])).toEqual(
      new Map([["url", "https://example.com/path=1"]]),
    );
  });

  it("ignores entries without a '=' separator", () => {
    expect(parseTagsOption(["noequalssign"])).toEqual(new Map());
  });

  it("trims whitespace from keys and values", () => {
    expect(parseTagsOption([" env = dev "])).toEqual(new Map([["env", "dev"]]));
  });
});
