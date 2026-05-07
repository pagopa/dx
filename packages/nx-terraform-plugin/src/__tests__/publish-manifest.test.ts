import { describe, expect, it } from "vitest";

import { parseModulePublishManifest } from "../publish/manifest.ts";

describe("parseModulePublishManifest", () => {
  it("parses a valid module.json manifest", () => {
    expect(
      parseModulePublishManifest({
        description: "Terraform module description",
        version: "1.2.3",
      }),
    ).toEqual({
      description: "Terraform module description",
      version: "1.2.3",
    });
  });

  it("throws for module.json missing description", () => {
    expect(() =>
      parseModulePublishManifest({
        version: "1.2.3",
      }),
    ).toThrow("Invalid module.json");
  });
});
