/**
 * Unit tests for registering tenant-qualified environments in the repository
 * `nx.json`.
 */
import { describe, expect, it } from "vitest";

import { syncAdditionalEnvironments } from "../sync-nx-additional-environments.js";

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
