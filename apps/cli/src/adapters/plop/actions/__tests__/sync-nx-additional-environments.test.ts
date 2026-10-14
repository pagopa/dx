/**
 * Unit tests for registering tenant-qualified environments in nx.json.
 */
import { describe, expect, it } from "vitest";

import { syncAdditionalEnvironments } from "../sync-nx-additional-environments.js";

type NxJsonFixture = {
  plugins: {
    options?: { additionalEnvironments?: string[] };
    plugin: string;
  }[];
};

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
  (JSON.parse(content) as NxJsonFixture).plugins.find(
    (entry) => entry.plugin === "@pagopa/nx-terraform",
  )?.options?.additionalEnvironments;

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
});
