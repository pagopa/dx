import { createTree } from "nx/src/devkit-testing-exports";
import { describe, expect, it } from "vitest";

import AgentPluginVersionActions from "../version-actions.ts";

const createVersionActions = (projectRoot: string) =>
  new AgentPluginVersionActions(
    {
      name: "agent-plugin-release",
      projects: ["agent-plugin-release"],
      projectsRelationship: "independent",
      resolvedVersionPlans: false,
      version: {},
    },
    {
      data: {
        name: "tests",
        projectType: "library",
        root: projectRoot,
      },
      name: "tests",
      type: "lib",
    },
    {
      adjustSemverBumpsForZeroMajorVersion: false,
      applyPreidToDependents: false,
      currentVersionResolver: "disk",
      currentVersionResolverMetadata: {},
      dockerOptions: {},
      fallbackCurrentVersionResolver: "disk",
      manifestRootsToUpdate: [
        {
          path: "{projectRoot}",
          preserveLocalDependencyProtocols: false,
        },
      ],
      preserveLocalDependencyProtocols: false,
      preserveMatchingDependencyRanges: false,
      specifierSource: "prompt",
      versionActionsOptions: {},
      versionPrefix: "auto",
    },
  );

describe("AgentPluginVersionActions", () => {
  it("reads and updates version while preserving other manifest fields", async () => {
    const projectRoot = "plugins/tests";
    const tree = createTree();
    tree.write(
      `${projectRoot}/plugin.json`,
      '{"description":"A test plugin","name":"tests","version":"0.1.0","futureField":{"enabled":true}}',
    );
    const versionActions = createVersionActions(projectRoot);

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toEqual({
      currentVersion: "0.1.0",
      manifestPath: `${projectRoot}/plugin.json`,
    });

    await expect(
      versionActions.updateProjectVersion(tree, "0.2.0"),
    ).resolves.toEqual([
      `Updated tests version to 0.2.0 in ${projectRoot}/plugin.json`,
    ]);

    const updatedContent = tree.read(`${projectRoot}/plugin.json`, "utf-8");
    if (updatedContent === null) {
      throw new Error("Expected plugin.json to be updated");
    }

    expect(JSON.parse(updatedContent)).toEqual({
      description: "A test plugin",
      futureField: { enabled: true },
      name: "tests",
      version: "0.2.0",
    });
    expect(updatedContent.endsWith("\n")).toBe(true);
  });

  it("returns null when plugin.json is missing or invalid", async () => {
    const projectRoot = "plugins/tests";
    const tree = createTree();
    const versionActions = createVersionActions(projectRoot);

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toBeNull();

    tree.write(`${projectRoot}/plugin.json`, "{ invalid");

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toBeNull();
  });

  it("throws a descriptive error when plugin.json cannot be parsed", async () => {
    const projectRoot = "plugins/tests";
    const tree = createTree();
    tree.write(`${projectRoot}/plugin.json`, "{ invalid");

    await expect(
      createVersionActions(projectRoot).updateProjectVersion(tree, "0.2.0"),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ format: "json" }),
        ]),
      }),
      message: expect.stringContaining(`${projectRoot}/plugin.json`),
    });
  });
});
