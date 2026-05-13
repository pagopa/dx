import { describe, expect, it } from "vitest";

import {
  ModulePublishManifestError,
  modulePublishManifestSchema,
  parseModulePublishManifest,
} from "../manifest.ts";
import {
  mergePublishOptions,
  PublishOptionsError,
} from "../publish-options.ts";

describe("parseModulePublishManifest", () => {
  it("parses a valid module.json manifest", () => {
    expect(
      parseModulePublishManifest({
        description: "Terraform module description",
        provider: "aws",
        version: "1.2.3",
      }),
    ).toEqual({
      description: "Terraform module description",
      provider: "aws",
      version: "1.2.3",
    });
  });

  it("throws for module.json missing description", () => {
    expect(() =>
      parseModulePublishManifest({
        version: "1.2.3",
      }),
    ).toThrowError(ModulePublishManifestError);
  });

  it("throws for module.json missing provider", () => {
    const invalidManifest = {
      description: "Terraform module description",
      version: "1.2.3",
    };
    const parseResult = modulePublishManifestSchema.safeParse(invalidManifest);
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      return;
    }

    const thrownError = (() => {
      try {
        parseModulePublishManifest(invalidManifest);
        return undefined;
      } catch (error) {
        return error;
      }
    })();

    expect(thrownError).toBeInstanceOf(ModulePublishManifestError);
    expect(thrownError).toMatchObject({
      issues: parseResult.error.issues,
      message: parseResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    });
  });

  it("formats multiple validation errors concisely", () => {
    const invalidManifest = {};
    const parseResult = modulePublishManifestSchema.safeParse(invalidManifest);
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      return;
    }

    expect(() => parseModulePublishManifest(invalidManifest)).toThrowError(
      parseResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  });

  it("merges plugin publish defaults with manifest fields", () => {
    expect(
      mergePublishOptions(
        { github: { owner: "pagopa-dx" } },
        { description: "x", provider: "aws", version: "1.2.3" },
      ),
    ).toEqual({
      description: "x",
      github: { owner: "pagopa-dx" },
      provider: "aws",
      version: "1.2.3",
    });
  });

  it("throws when merged publish options are invalid", () => {
    const thrownError = (() => {
      try {
        mergePublishOptions(
          {},
          { description: "x", provider: "aws", version: "1.2.3" },
        );
        return undefined;
      } catch (error) {
        return error;
      }
    })();

    expect(thrownError).toBeInstanceOf(PublishOptionsError);
    expect(thrownError).toHaveProperty("message", "Invalid publish options");
    expect(thrownError).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: ["github", "owner"],
        }),
      ]),
    });
  });

  describe("semver version validation", () => {
    it("accepts valid semver versions", () => {
      const validVersions = [
        "1.2.3",
        "0.0.1",
        "10.20.30",
        "1.2.3-beta.1",
        "1.2.3-beta.1+build.7",
        "1.0.0-alpha",
        "1.0.0+20130313144700",
      ];

      for (const version of validVersions) {
        expect(
          parseModulePublishManifest({
            description: "Test module",
            provider: "aws",
            version,
          }),
        ).toMatchObject({ version });
      }
    });

    it("rejects invalid semver versions", () => {
      const invalidVersions = [
        "v1.2.3", // prefixed with v
        "1.2", // partial version
        "1", // partial version
        "abc", // arbitrary string
        "1.2.x", // placeholder
        "", // empty string
      ];

      for (const version of invalidVersions) {
        expect(() =>
          parseModulePublishManifest({
            description: "Test module",
            provider: "aws",
            version,
          }),
        ).toThrowError(ModulePublishManifestError);
      }
    });
  });
});
