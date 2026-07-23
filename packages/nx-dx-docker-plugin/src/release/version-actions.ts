/** Manages Docker-only project versions persisted in Nx project metadata. */
import type { ProjectGraph, Tree } from "@nx/devkit";

import { VersionActions } from "nx/release";
import { z } from "zod/v4";

const projectJsonSchema = z.object({
  metadata: z
    .object({
      version: z.string().trim().min(1),
    })
    .passthrough(),
}).passthrough();

/**
 * Implements Nx Release for container-only projects that have no package
 * manifest. The version lives in project.json metadata.version so it can be
 * updated by nx release and consumed later by the publishing executor.
 */
export default class DockerProjectVersionActions extends VersionActions {
  validManifestFilenames = ["project.json"];

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

  async readCurrentVersionOfDependency(
    _tree: Tree,
    _projectGraph: ProjectGraph,
    _dependencyProjectName: string,
  ): Promise<{
    currentVersion: null;
    dependencyCollection: null;
  }> {
    return { currentVersion: null, dependencyCollection: null };
  }

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

    tree.write(
      manifestPath,
      JSON.stringify(
        {
          ...parsed.data,
          metadata: { ...parsed.data.metadata, version: newVersion },
        },
        null,
        2,
      ) + "\n",
    );

    return [
      `Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`,
    ];
  }
}
