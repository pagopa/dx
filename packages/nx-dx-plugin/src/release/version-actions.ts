/** Reads and updates Nx Release versions stored in project.json metadata. */
import { parseJson, type Tree } from "@nx/devkit";
import { VersionActions } from "nx/release";
import { z } from "zod/v4";

const projectJsonSchema = z
  .object({
    metadata: z
      .object({
        version: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * Stores project versions in `project.json` metadata for projects without a
 * package manifest. Configure with
 * `release.version.versionActions: "@pagopa/nx-dx/release/version-actions"`.
 */
export default class ProjectJsonVersionActions extends VersionActions {
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
      const parsed = projectJsonSchema.safeParse(parseJson(content));
      return parsed.success
        ? { currentVersion: parsed.data.metadata.version, manifestPath }
        : null;
    } catch {
      return null;
    }
  }

  async readCurrentVersionOfDependency(): Promise<{
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
      projectJson = parseJson(content);
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
