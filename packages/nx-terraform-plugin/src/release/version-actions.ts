import type { ProjectGraph, Tree } from "@nx/devkit";

import { VersionActions } from "nx/release";

/**
 * Custom Nx Release VersionActions implementation for Terraform modules.
 *
 * This class manages versioning of publishable Terraform modules by reading
 * and writing the `version` field in module.json files.
 *
 * Key behaviors:
 * - Reads current version from module.json (disk-based resolution)
 * - Updates version in module.json during release
 * - Does NOT support registry-based version resolution
 * - Does NOT manage module dependencies (explicit no-op)
 *
 * Used via project-level
 * `release.version.versionActions: "@pagopa/nx-terraform-plugin/release/version-actions"`
 * in inferred Terraform project configuration.
 */
export default class TerraformVersionActions extends VersionActions {
  validManifestFilenames = ["module.json"];

  /**
   * Registry-based version resolution is not supported for Terraform modules.
   *
   * Terraform modules published to GitHub do not have a traditional registry
   * with queryable version metadata, so we always return null here.
   *
   * Users should configure `currentVersionResolver: "disk"` or `"git-tag"`
   * for Terraform projects.
   *
   * @returns null (not supported)
   */
  async readCurrentVersionFromRegistry(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tree: Tree,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    _currentVersionResolverMetadata: any,
  ): Promise<null | { currentVersion: null | string; logText: string }> {
    return null;
  }

  /**
   * Reads the current version from the module.json manifest file.
   *
   * Returns null if:
   * - The module.json file does not exist
   * - The file is invalid JSON
   * - The version field is missing or not a string
   *
   * @param tree - The virtual file system tree
   * @returns An object with the current version and manifest path, or null
   */
  async readCurrentVersionFromSourceManifest(
    tree: Tree,
  ): Promise<null | { currentVersion: string; manifestPath: string }> {
    const manifestPath = `${this.projectGraphNode.data.root}/module.json`;

    if (!tree.exists(manifestPath)) {
      return null;
    }

    try {
      const content = tree.read(manifestPath, "utf-8");
      if (!content) {
        return null;
      }
      const manifest = JSON.parse(content);

      if (typeof manifest.version !== "string") {
        return null;
      }

      return {
        currentVersion: manifest.version,
        manifestPath,
      };
    } catch {
      return null;
    }
  }

  /**
   * Reads the current version of a dependency.
   *
   * For Terraform modules, dependencies are not versioned in the manifest,
   * so we always return null for both currentVersion and dependencyCollection.
   *
   * @returns null for both currentVersion and dependencyCollection
   */
  async readCurrentVersionOfDependency(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tree: Tree,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectGraph: ProjectGraph,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dependencyProjectName: string,
  ): Promise<{
    currentVersion: null | string;
    dependencyCollection: null | string;
  }> {
    return {
      currentVersion: null,
      dependencyCollection: null,
    };
  }

  /**
   * Explicit no-op for dependency updates.
   *
   * Terraform modules do not manage versioned dependencies in module.json,
   * so this method intentionally does nothing and returns an empty array.
   *
   * Dependencies in Terraform are specified via source references in .tf files,
   * which are not managed by Nx Release.
   *
   * @returns An empty array (no updates performed)
   */
  async updateProjectDependencies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tree: Tree,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectGraph: ProjectGraph,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dependenciesToUpdate: Record<string, string>,
  ): Promise<string[]> {
    return [];
  }

  /**
   * Updates the version field in the module.json file.
   *
   * Preserves:
   * - Field order in the JSON object
   * - JSON formatting (indentation)
   * - Other fields in the manifest
   *
   * @param tree - The virtual file system tree
   * @param newVersion - The new semantic version to write
   * @returns An array with a single log message describing the update
   */
  async updateProjectVersion(
    tree: Tree,
    newVersion: string,
  ): Promise<string[]> {
    const manifestPath = `${this.projectGraphNode.data.root}/module.json`;
    const content = tree.read(manifestPath, "utf-8");
    if (!content) {
      throw new Error(`Failed to read ${manifestPath}`);
    }

    let manifest;
    try {
      manifest = JSON.parse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse ${manifestPath}: ${message}`, {
        cause: error,
      });
    }

    // Update version while preserving field order and formatting
    manifest.version = newVersion;

    tree.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    return [
      `Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`,
    ];
  }
}
