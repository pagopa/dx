/** Manages Docker-only project versions persisted in Nx project metadata. */
import type { Tree } from "@nx/devkit";

import { VersionActions } from "nx/release";
import { z } from "zod/v4";

const projectJsonSchema = z
  .object({
    metadata: z
      .object({
        version: z.string().trim().min(1),
      })
      .passthrough(),
  })
  .passthrough();

const writeProjectVersion = (
  tree: Tree,
  manifestPath: string,
  projectJson: z.infer<typeof projectJsonSchema>,
  newVersion: string,
): void => {
  tree.write(
    manifestPath,
    JSON.stringify(
      {
        ...projectJson,
        metadata: { ...projectJson.metadata, version: newVersion },
      },
      null,
      2,
    ) + "\n",
  );
};

/**
 * Implements Nx Release for container-only projects that have no package
 * manifest. The version lives in project.json metadata.version so it can be
 * updated by nx release and consumed later by the publishing executor.
 */
export default class DockerProjectVersionActions extends VersionActions {
  validManifestFilenames = ["project.json"];

  // Docker images have no registry manifest that Nx can use as version source.
  async readCurrentVersionFromRegistry(): Promise<null> {
    return null;
  }

  async readCurrentVersionFromSourceManifest(
    tree: Tree,
  ): Promise<null | { currentVersion: string; manifestPath: string }> {
    const manifestPath = `${this.projectGraphNode.data.root}/project.json`;
    const content = tree.read(manifestPath, "utf-8");
    if (!content) {
      return null;
    }

    try {
      const parsed = projectJsonSchema.safeParse(JSON.parse(content));
      return parsed.success
        ? { currentVersion: parsed.data.metadata.version, manifestPath }
        : null;
    } catch {
      return null;
    }
  }

  // Docker-only project metadata has no dependency version declarations.
  async readCurrentVersionOfDependency(): Promise<{
    currentVersion: null;
    dependencyCollection: null;
  }> {
    return { currentVersion: null, dependencyCollection: null };
  }

  // There are no dependency declarations to update in project.json metadata.
  async updateProjectDependencies(): Promise<string[]> {
    return [];
  }

  async updateProjectVersion(
    tree: Tree,
    newVersion: string,
  ): Promise<string[]> {
    const manifestPath = `${this.projectGraphNode.data.root}/project.json`;
    const content = tree.read(manifestPath, "utf-8");
    if (!content) {
      throw new Error(`Failed to read ${manifestPath}`);
    }

    let projectJson: unknown;
    try {
      projectJson = JSON.parse(content);
    } catch (cause) {
      throw new Error(`Failed to parse ${manifestPath}.`, { cause });
    }

    const parsed = projectJsonSchema.safeParse(projectJson);
    if (!parsed.success) {
      throw new Error(`Could not read metadata.version from ${manifestPath}.`, {
        cause: parsed.error,
      });
    }

    writeProjectVersion(tree, manifestPath, parsed.data, newVersion);

    return [
      `Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`,
    ];
  }
}
