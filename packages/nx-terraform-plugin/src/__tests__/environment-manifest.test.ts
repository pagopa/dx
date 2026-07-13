import { describe, expect, it } from "vitest";

import {
  EnvironmentManifestError,
  environmentManifestSchema,
  parseEnvironmentManifest,
} from "../manifest.ts";

describe("parseEnvironmentManifest", () => {
  it("parses a valid environment.json manifest", () => {
    const manifest = {
      deployment: {
        applyEnvironment: "infra-dev-cd",
        planEnvironment: "infra-dev-ci",
        runnerLabel: "dev",
      },
      version: "0.1.0",
    };

    expect(parseEnvironmentManifest(manifest)).toEqual(manifest);
  });

  it("throws for environment.json missing version", () => {
    expect(() =>
      parseEnvironmentManifest({
        deployment: {
          applyEnvironment: "infra-dev-cd",
          planEnvironment: "infra-dev-ci",
          runnerLabel: "dev",
        },
      }),
    ).toThrowError(EnvironmentManifestError);
  });

  it("throws for environment.json with an empty version", () => {
    const invalidManifest = {
      deployment: {
        applyEnvironment: "infra-dev-cd",
        planEnvironment: "infra-dev-ci",
        runnerLabel: "dev",
      },
      version: "",
    };
    const parseResult = environmentManifestSchema.safeParse(invalidManifest);
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      return;
    }

    const thrownError = (() => {
      try {
        parseEnvironmentManifest(invalidManifest);
        return undefined;
      } catch (error) {
        return error;
      }
    })();

    expect(thrownError).toBeInstanceOf(EnvironmentManifestError);
    expect(thrownError).toMatchObject({
      issues: parseResult.error.issues,
    });
  });

  it("parses environment.json without deployment overrides", () => {
    expect(parseEnvironmentManifest({ version: "0.1.0" })).toEqual({
      version: "0.1.0",
    });
  });
});
