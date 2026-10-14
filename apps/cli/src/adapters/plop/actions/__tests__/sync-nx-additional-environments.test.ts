/**
 * Unit tests for registering tenant-qualified environments in nx.json.
 */
import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { nxJsonSchema } from "../../../../domain/nx-json.js";
import { syncAdditionalEnvironments } from "../sync-nx-additional-environments.js";

const buildNxJson = (additionalEnvironments?: string[]): string =>
  `${JSON.stringify(
    {
      plugins: [
        { plugin: "@nx/js/typescript" },
        {
          include: ["infra/**"],
          options: {
            ...(additionalEnvironments ? { additionalEnvironments } : {}),
            initTarget: { platforms: ["linux_amd64"] },
          },
          plugin: "@pagopa/nx-terraform",
        },
      ],
    },
    null,
    2,
  )}\n`;

const getAdditionalEnvironments = (content: string): string[] | undefined =>
  nxJsonSchema
    .parse(parse(content, undefined, { allowTrailingComma: true }))
    .plugins?.find((entry) => entry.plugin === "@pagopa/nx-terraform")?.options
    ?.additionalEnvironments;

describe("syncAdditionalEnvironments", () => {
  it("registers a tenant-qualified environment in the Nx Terraform plugin options", () => {
    const result = syncAdditionalEnvironments(buildNxJson(), "ced-prod");

    expect(result).toBeDefined();
    expect(getAdditionalEnvironments(result ?? "")).toEqual(["ced-prod"]);
  });

  it("preserves the existing additional environments", () => {
    const result = syncAdditionalEnvironments(
      buildNxJson(["cgn-dev"]),
      "ced-prod",
    );

    expect(getAdditionalEnvironments(result ?? "")).toEqual([
      "cgn-dev",
      "ced-prod",
    ]);
  });

  it("is idempotent when the environment is already registered", () => {
    expect(
      syncAdditionalEnvironments(buildNxJson(["ced-prod"]), "ced-prod"),
    ).toBeUndefined();
  });

  it("ignores lifecycle environments recognized by the plugin", () => {
    expect(syncAdditionalEnvironments(buildNxJson(), "dev")).toBeUndefined();
    expect(syncAdditionalEnvironments(buildNxJson(), "uat")).toBeUndefined();
    expect(syncAdditionalEnvironments(buildNxJson(), "prod")).toBeUndefined();
  });

  it("ignores repositories without the Nx Terraform plugin", () => {
    const content = `${JSON.stringify(
      { plugins: [{ plugin: "@nx/js/typescript" }] },
      null,
      2,
    )}\n`;

    expect(syncAdditionalEnvironments(content, "ced-prod")).toBeUndefined();
  });

  it("preserves comments and trailing commas when registering the environment", () => {
    const content = [
      "{",
      "  // DX Nx Terraform plugin configuration",
      '  "plugins": [',
      "    {",
      '      "plugin": "@nx/js/typescript",',
      "    },",
      "    {",
      '      "include": ["infra/**"],',
      '      "plugin": "@pagopa/nx-terraform",',
      "    },",
      "  ],",
      "}",
      "",
    ].join("\n");

    const result = syncAdditionalEnvironments(content, "ced-prod");

    expect(result).toBeDefined();
    expect(result).toContain("// DX Nx Terraform plugin configuration");
    expect(getAdditionalEnvironments(result ?? "")).toEqual(["ced-prod"]);
  });

  it("leaves an invalid nx.json untouched", () => {
    expect(syncAdditionalEnvironments("not-json", "ced-prod")).toBeUndefined();
  });

  it("leaves an nx.json with an unexpected shape untouched", () => {
    expect(
      syncAdditionalEnvironments('{ "plugins": {} }', "ced-prod"),
    ).toBeUndefined();
  });
});
