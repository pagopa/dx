import { describe, expect, it } from "vitest";

import {
  ModulePublishManifestError,
  modulePublishManifestSchema,
  parseModulePublishManifest,
} from "../manifest.ts";

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
});
