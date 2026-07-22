import { createTree } from "nx/src/devkit-testing-exports";
import { describe, expect, it } from "vitest";

import DockerProjectVersionActions from "../version-actions.ts";

const createVersionActions = (projectRoot: string) =>
  new DockerProjectVersionActions(
    {
      name: "container-release",
      projects: ["container-release"],
      projectsRelationship: "independent",
      version: {},
    },
    {
      data: {
        name: "container-release",
        projectType: "application",
        root: projectRoot,
      },
      name: "container-release",
      type: "app",
    },
    {
      currentVersionResolver: "disk",
      manifestRootsToUpdate: ["{projectRoot}"],
    },
  );

describe("DockerProjectVersionActions", () => {
  it("reads and updates the durable project metadata version", async () => {
    const projectRoot = "containers/test-runner";
    const tree = createTree();
    tree.write(
      `${projectRoot}/project.json`,
      JSON.stringify({
        metadata: {
          docker: { repositoryName: "pagopa/test-runner" },
          version: "0.0.2",
        },
      }),
    );
    const versionActions = createVersionActions(projectRoot);

    await expect(
      versionActions.readCurrentVersionFromSourceManifest(tree),
    ).resolves.toEqual({
      currentVersion: "0.0.2",
      manifestPath: `${projectRoot}/project.json`,
    });

    await expect(versionActions.updateProjectVersion(tree, "0.0.3")).resolves
      .toEqual([
        `Updated container-release version to 0.0.3 in ${projectRoot}/project.json`,
      ]);

    const updated = tree.read(`${projectRoot}/project.json`, "utf-8");
    if (!updated) {
      throw new Error("Expected project.json to be updated");
    }

    expect(JSON.parse(updated)).toEqual({
      metadata: {
        docker: { repositoryName: "pagopa/test-runner" },
        version: "0.0.3",
      },
    });
  });
});