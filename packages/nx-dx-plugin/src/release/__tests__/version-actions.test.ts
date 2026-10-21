import { createTree } from "nx/src/devkit-testing-exports";
import { describe, expect, it } from "vitest";

import ProjectJsonVersionActions from "../version-actions.ts";

const createVersionActions = (projectRoot: string) =>
  new ProjectJsonVersionActions(
    {
      name: "test-release",
      projects: ["test-project"],
      projectsRelationship: "independent",
      resolvedVersionPlans: false,
      version: {},
    },
    {
      data: {
        name: "test-project",
        projectType: "application",
        root: projectRoot,
      },
      name: "test-project",
      type: "app",
    },
    {
      adjustSemverBumpsForZeroMajorVersion: false,
      applyPreidToDependents: false,
      currentVersionResolver: "disk",
      currentVersionResolverMetadata: {},
      dockerOptions: {},
      fallbackCurrentVersionResolver: "disk",
      manifestRootsToUpdate: [],
      preserveLocalDependencyProtocols: false,
      preserveMatchingDependencyRanges: false,
      specifierSource: "prompt",
      versionActionsOptions: {},
      versionPrefix: "auto",
    },
  );

describe("ProjectJsonVersionActions", () => {
  it("uses only project.json as its valid manifest", () => {
    expect(createVersionActions("apps/test").validManifestFilenames).toEqual([
      "project.json",
    ]);
  });

  it("reads and updates metadata.version while preserving project metadata", async () => {
    const projectRoot = "apps/test";
    const tree = createTree();
    tree.write(
      `${projectRoot}/project.json`,
      JSON.stringify({
        metadata: {
          owner: "platform",
          version: "1.2.3",
        },
        name: "test-project",
        version: "99.0.0",
      }),
    );
    const versionActions = createVersionActions(projectRoot);

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toEqual({
      currentVersion: "1.2.3",
      manifestPath: `${projectRoot}/project.json`,
    });

    await expect(
      versionActions.updateProjectVersion(tree, "2.0.0"),
    ).resolves.toEqual([
      `Updated test-project version to 2.0.0 in ${projectRoot}/project.json`,
    ]);

    const updated = tree.read(`${projectRoot}/project.json`, "utf-8");
    if (!updated) {
      throw new Error("Expected project.json to be updated");
    }

    expect(JSON.parse(updated)).toEqual({
      metadata: {
        owner: "platform",
        version: "2.0.0",
      },
      name: "test-project",
      version: "99.0.0",
    });
  });

  it("does not read or update package.json", async () => {
    const projectRoot = "apps/test";
    const tree = createTree();
    tree.write(
      `${projectRoot}/package.json`,
      JSON.stringify({ version: "1.0.0" }),
    );
    const versionActions = createVersionActions(projectRoot);

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toBeNull();
    await expect(
      versionActions.updateProjectVersion(tree, "2.0.0"),
    ).rejects.toThrow(`Failed to read ${projectRoot}/project.json`);

    expect(tree.read(`${projectRoot}/package.json`, "utf-8")).toBe(
      JSON.stringify({ version: "1.0.0" }),
    );
  });

  it.each([
    ["missing metadata.version", { metadata: {} }],
    ["a non-string metadata.version", { metadata: { version: 1 } }],
  ])("returns null for %s", async (_description, manifest) => {
    const projectRoot = "apps/test";
    const tree = createTree();
    tree.write(`${projectRoot}/project.json`, JSON.stringify(manifest));

    await expect(
      createVersionActions(projectRoot).readCurrentVersionFromSourceManifest(
        tree,
      ),
    ).resolves.toBeNull();
  });

  it("returns null when project.json contains invalid JSON", async () => {
    const projectRoot = "apps/test";
    const tree = createTree();
    tree.write(`${projectRoot}/project.json`, "{ invalid json }");

    await expect(
      createVersionActions(projectRoot).readCurrentVersionFromSourceManifest(
        tree,
      ),
    ).resolves.toBeNull();
  });

  it("throws a descriptive error when project.json contains invalid JSON", async () => {
    const projectRoot = "apps/test";
    const tree = createTree();
    tree.write(`${projectRoot}/project.json`, "{ invalid json }");

    await expect(
      createVersionActions(projectRoot).updateProjectVersion(tree, "2.0.0"),
    ).rejects.toMatchObject({
      cause: expect.any(SyntaxError),
      message: `Failed to parse ${projectRoot}/project.json.`,
    });
  });
});
