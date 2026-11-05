/**
 * Unit tests for registering tenant-qualified environments in the repository
 * `nx.json`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  syncAdditionalEnvironments,
  syncNxAdditionalEnvironments,
} from "../sync-nx-additional-environments.js";

const nxJson = [
  "{",
  '  "plugins": [',
  "    {",
  '      "plugin": "@pagopa/nx-terraform",',
  '      "include": ["infra/**"],',
  '      "options": {',
  '        "additionalEnvironments": []',
  "      }",
  "    }",
  "  ]",
  "}",
  "",
].join("\n");

describe("syncAdditionalEnvironments", () => {
  it("registers a tenant-qualified environment", () => {
    const result = syncAdditionalEnvironments(nxJson, "ced-prod");

    expect(result).toContain(
      '"additionalEnvironments": [\n          "ced-prod"\n        ]',
    );
  });

  it("does not touch lifecycle environments", () => {
    expect(syncAdditionalEnvironments(nxJson, "dev")).toBeUndefined();
  });

  it("throws when nx.json cannot be parsed", () => {
    expect(() => syncAdditionalEnvironments("{ not json", "ced-prod")).toThrow(
      "Cannot register env:ced-prod in nx.json",
    );
  });
});

describe("syncNxAdditionalEnvironments", () => {
  const testFile = fileURLToPath(import.meta.url);

  it("skips the registration when the repository has no nx.json", async () => {
    await expect(
      syncNxAdditionalEnvironments("ced-prod", path.dirname(testFile)),
    ).resolves.toContain("No nx.json found");
  });

  it("propagates a read failure that is not a missing nx.json", async () => {
    await expect(
      syncNxAdditionalEnvironments("ced-prod", testFile),
    ).rejects.toThrow(/ENOTDIR/);
  });
});
