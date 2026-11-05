import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import { createNodesV2 } from "../index.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-agent-plugin-"),
  );
  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });
  return workspaceRoot;
};

describe("createNodesV2", () => {
  it("discovers plugin.json files anywhere in the workspace", () => {
    expect(createNodesV2[0]).toBe("**/plugin.json");
  });

  it("infers a library with the manifest name and release version action", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("tools", "agent-one");
    const manifestPath = path.join(workspaceRoot, projectRoot, "plugin.json");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(
      manifestPath,
      JSON.stringify({ name: "test-agent-plugin", version: "1.2.3" }),
    );

    const result = await createNodesV2[1](
      [path.join(projectRoot, "plugin.json")],
      {},
      { nxJsonConfiguration: {}, workspaceRoot },
    );

    expect(result[0]?.[1].projects?.[projectRoot]).toEqual({
      name: "test-agent-plugin",
      projectType: "library",
      release: {
        version: {
          currentVersionResolver: "disk",
          manifestRootsToUpdate: ["{projectRoot}"],
          versionActions: "@pagopa/nx-agent-plugins/release/version-actions",
        },
      },
      root: projectRoot,
      tags: ["agent-plugins"],
    });
  });

  it("skips invalid or incomplete manifests", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const incompleteRoot = path.join("plugins", "incomplete");
    const malformedRoot = path.join("tools", "malformed");
    const incompleteManifest = path.join(
      workspaceRoot,
      incompleteRoot,
      "plugin.json",
    );
    const malformedManifest = path.join(
      workspaceRoot,
      malformedRoot,
      "plugin.json",
    );
    await Promise.all([
      fs.mkdir(path.dirname(incompleteManifest), { recursive: true }),
      fs.mkdir(path.dirname(malformedManifest), { recursive: true }),
    ]);
    await Promise.all([
      fs.writeFile(incompleteManifest, JSON.stringify({ name: "incomplete" })),
      fs.writeFile(malformedManifest, "{ invalid"),
    ]);

    const result = await createNodesV2[1](
      [
        path.join(incompleteRoot, "plugin.json"),
        path.join(malformedRoot, "plugin.json"),
      ],
      {},
      { nxJsonConfiguration: {}, workspaceRoot },
    );

    expect(
      result.flatMap(([, node]) => Object.keys(node.projects ?? {})),
    ).toEqual([]);
  });
});
