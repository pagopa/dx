/**
 * Verifies wrapper option defaults remain stable when Nx plugin options are omitted.
 */
import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";

describe("parseOptions", () => {
  it("preserves upstream plugin options and wrapper extensions", () => {
    expect(
      parseOptions({
        buildTarget: "container:build",
        dockerImageAuthors: "Platform Team",
        runTarget: "container:run",
      }),
    ).toEqual({
      buildTarget: "container:build",
      dockerImageAuthors: "Platform Team",
      runTarget: "container:run",
    });
  });

  it("keeps plugin options empty when nothing is configured", () => {
    expect(parseOptions(undefined)).toEqual({});
  });

  it("deep-clones nested target options so frozen Nx config objects stay mutable downstream", () => {
    const buildTarget = Object.freeze({
      args: Object.freeze(["--platform linux/amd64"]),
      configurations: Object.freeze({
        production: Object.freeze({
          args: Object.freeze(["--push"]),
        }),
      }),
    });

    const parsedOptions = parseOptions({
      buildTarget,
      runTarget: "docker:run",
    });

    expect(parsedOptions.buildTarget).toEqual(buildTarget);
    expect(parsedOptions.buildTarget).not.toBe(buildTarget);
    expect(parsedOptions.buildTarget).toEqual({
      args: ["--platform linux/amd64"],
      configurations: {
        production: {
          args: ["--push"],
        },
      },
    });
    if (typeof parsedOptions.buildTarget === "object") {
      expect(parsedOptions.buildTarget.configurations).not.toBe(buildTarget.configurations);
    }
  });
});