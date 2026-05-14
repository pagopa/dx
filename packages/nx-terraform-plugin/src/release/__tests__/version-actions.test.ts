import { createTree } from "nx/src/devkit-testing-exports";
import { describe, expect, it } from "vitest";

import { TerraformVersionActions } from "../version-actions.ts";

// Helper functions to create mock objects for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockReleaseGroup = (): any => ({
  name: "test-group",
  projects: ["test-project"],
  projectsRelationship: "independent",
  version: {
    generator: "@nx/js:release-version",
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockProjectGraphNode = (root: string): any => ({
  data: {
    name: "test-project",
    projectType: "library",
    root,
  },
  name: "test-project",
  type: "lib",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockFinalConfigForProject = (): any => ({
  currentVersionResolver: "disk",
  manifestRootsToUpdate: ["{projectRoot}"],
});

// eslint-disable-next-line max-lines-per-function
describe("TerraformVersionActions", () => {
  describe("validManifestFilenames", () => {
    it("defines module.json as the valid manifest filename", () => {
      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode("infra/modules/test");
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      expect(versionActions.validManifestFilenames).toEqual(["module.json"]);
    });
  });

  describe("readCurrentVersionFromSourceManifest", () => {
    it("reads version from module.json", async () => {
      const tree = createTree();
      const root = "infra/modules/test";
      tree.write(
        `${root}/module.json`,
        JSON.stringify({
          description: "Test module",
          provider: "aws",
          version: "1.2.3",
        }),
      );

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result =
        await versionActions.readCurrentVersionFromSourceManifest(tree);

      expect(result).toEqual({
        currentVersion: "1.2.3",
        manifestPath: `${root}/module.json`,
      });
    });

    it("returns null if module.json does not exist", async () => {
      const tree = createTree();
      const root = "infra/modules/test";

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result =
        await versionActions.readCurrentVersionFromSourceManifest(tree);

      expect(result).toBeNull();
    });

    it("returns null if version field is missing", async () => {
      const tree = createTree();
      const root = "infra/modules/test";
      tree.write(
        `${root}/module.json`,
        JSON.stringify({
          description: "Test module",
          provider: "aws",
        }),
      );

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result =
        await versionActions.readCurrentVersionFromSourceManifest(tree);

      expect(result).toBeNull();
    });
  });

  describe("updateProjectVersion", () => {
    it("updates version in module.json", async () => {
      const tree = createTree();
      const root = "infra/modules/test";
      tree.write(
        `${root}/module.json`,
        JSON.stringify(
          {
            description: "Test module",
            provider: "aws",
            version: "1.2.3",
          },
          null,
          2,
        ),
      );

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const logMessages = await versionActions.updateProjectVersion(
        tree,
        "2.0.0",
      );

      const updatedContent = tree.read(`${root}/module.json`, "utf-8");
      if (!updatedContent) {
        throw new Error("Failed to read updated manifest");
      }
      const updatedManifest = JSON.parse(updatedContent);

      expect(updatedManifest.version).toBe("2.0.0");
      expect(updatedManifest.provider).toBe("aws");
      expect(updatedManifest.description).toBe("Test module");
      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain("2.0.0");
    });

    it("preserves all manifest fields when updating version", async () => {
      const tree = createTree();
      const root = "infra/modules/test";
      const originalContent = JSON.stringify(
        {
          description: "Test module",
          provider: "aws",
          version: "1.2.3",
        },
        null,
        2,
      );
      tree.write(`${root}/module.json`, originalContent);

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      await versionActions.updateProjectVersion(tree, "2.0.0");

      const updatedContent = tree.read(`${root}/module.json`, "utf-8");
      if (!updatedContent) {
        throw new Error("Failed to read updated manifest");
      }
      const updatedManifest = JSON.parse(updatedContent);

      // Verify all fields are present with correct values
      expect(updatedManifest.version).toBe("2.0.0");
      expect(updatedManifest.provider).toBe("aws");
      expect(updatedManifest.description).toBe("Test module");
      expect(Object.keys(updatedManifest)).toHaveLength(3);
    });

    it("throws descriptive error when module.json contains invalid JSON", async () => {
      const tree = createTree();
      const root = "infra/modules/test";
      tree.write(`${root}/module.json`, "{ invalid json }");

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode(root);
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      await expect(
        versionActions.updateProjectVersion(tree, "2.0.0"),
      ).rejects.toMatchObject({
        cause: expect.any(SyntaxError),
        message: expect.stringMatching(
          new RegExp(`Failed to parse ${root}/module\\.json:.*JSON`),
        ),
      });
    });
  });

  describe("readCurrentVersionFromRegistry", () => {
    it("returns null as registry resolution is not supported", async () => {
      const tree = createTree();
      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode("infra/modules/test");
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result = await versionActions.readCurrentVersionFromRegistry(
        tree,
        {},
      );

      expect(result).toBeNull();
    });
  });

  describe("readCurrentVersionOfDependency", () => {
    it("returns null as dependency versioning is not managed", async () => {
      const tree = createTree();
      const mockProjectGraph = {
        dependencies: {},
        nodes: {},
      };

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode("infra/modules/test");
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result = await versionActions.readCurrentVersionOfDependency(
        tree,
        mockProjectGraph,
        "dependency-project",
      );

      expect(result).toEqual({
        currentVersion: null,
        dependencyCollection: null,
      });
    });
  });

  describe("updateProjectDependencies", () => {
    it("returns empty array as dependency updates are not supported", async () => {
      const tree = createTree();
      const mockProjectGraph = {
        dependencies: {},
        nodes: {},
      };

      const releaseGroup = createMockReleaseGroup();
      const projectGraphNode = createMockProjectGraphNode("infra/modules/test");
      const finalConfigForProject = createMockFinalConfigForProject();

      const versionActions = new TerraformVersionActions(
        releaseGroup,
        projectGraphNode,
        finalConfigForProject,
      );

      const result = await versionActions.updateProjectDependencies(
        tree,
        mockProjectGraph,
        { "dep-1": "1.0.0", "dep-2": "2.0.0" },
      );

      expect(result).toEqual([]);
    });
  });
});
