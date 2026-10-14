import { type ProjectGraph, readCachedProjectGraph } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
// Verifies workflow application choices against the Nx project graph.
import assert from "node:assert/strict";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import { workflowGenerator } from "../workflows.js";

vi.mock("@nx/devkit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@nx/devkit")>()),
  readCachedProjectGraph: vi.fn(),
}));

describe("workflowGenerator", () => {
  it("prefixes the generated workflow with an underscore", async () => {
    const tree = createTreeWithEmptyWorkspace();
    vi.mocked(readCachedProjectGraph).mockReturnValue({
      dependencies: {},
      nodes: {},
    });

    await workflowGenerator(tree);

    expect(tree.exists(".github/workflows/_deploy.yaml")).toBe(true);
    expect(tree.exists(".github/workflows/deploy.yaml")).toBe(false);
  });

  it("includes only applications with non-empty target resources", async () => {
    const tree = createTreeWithEmptyWorkspace();
    const nodes: ProjectGraph["nodes"] = {
      deployable: {
        data: {
          metadata: {
            "pagopa-dx": { targetResources: [{ name: "resource" }] },
          },
          projectType: "application",
          root: "apps/deployable",
        },
        name: "deployable",
        type: "app",
      },
      empty: {
        data: {
          metadata: { "pagopa-dx": { targetResources: [] } },
          projectType: "application",
          root: "apps/empty",
        },
        name: "empty",
        type: "app",
      },
      library: {
        data: {
          metadata: {
            "pagopa-dx": { targetResources: [{ name: "resource" }] },
          },
          projectType: "library",
          root: "packages/library",
        },
        name: "library",
        type: "lib",
      },
      missing: {
        data: { projectType: "application", root: "apps/missing" },
        name: "missing",
        type: "app",
      },
      missingResources: {
        data: {
          metadata: { "pagopa-dx": {} },
          projectType: "application",
          root: "apps/missing-resources",
        },
        name: "missingResources",
        type: "app",
      },
    };
    vi.mocked(readCachedProjectGraph).mockReturnValue({
      dependencies: {},
      nodes,
    });

    await workflowGenerator(tree);

    const content = tree.read(".github/workflows/_deploy.yaml", "utf-8");
    assert.ok(content !== null);
    const workflow = parse(content);
    expect(workflow.on.workflow_dispatch.inputs.project_name.options).toEqual([
      "deployable",
    ]);
    expect(workflow.jobs.deploy).toMatchObject({
      secrets: "inherit",
      uses: "pagopa/dx/.github/workflows/deploy-v1.yaml@main",
      with: {
        environment: "${{ inputs.environment }}",
        project_name: "${{ inputs.project_name }}",
        version: "${{ inputs.version }}",
      },
    });
  });
});
