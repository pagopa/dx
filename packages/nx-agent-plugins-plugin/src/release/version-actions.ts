/** Reads and updates Nx Release versions in agent plugin manifests. */
import type { Tree } from "@nx/devkit";

import { VersionActions } from "nx/release";
import { ZodError } from "zod/v4";

import {
  type AgentPluginManifest,
  agentPluginManifestSchema,
  parseAgentPluginManifest,
} from "../manifest.ts";

export default class AgentPluginVersionActions extends VersionActions {
  validManifestFilenames = ["plugin.json"];

  async readCurrentVersionFromRegistry(): Promise<null> {
    return null;
  }

  async readCurrentVersionFromSourceManifest(
    tree: Tree,
  ): Promise<null | { currentVersion: string; manifestPath: string }> {
    const manifestPath = `${this.projectGraphNode.data.root}/plugin.json`;
    const content = tree.read(manifestPath, "utf-8");
    if (content === null) {
      return null;
    }

    try {
      const manifest = parseAgentPluginManifest(content);
      return { currentVersion: manifest.version, manifestPath };
    } catch (error) {
      if (error instanceof ZodError) {
        return null;
      }
      throw error;
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
    const manifestPath = `${this.projectGraphNode.data.root}/plugin.json`;
    const content = tree.read(manifestPath, "utf-8");
    if (content === null) {
      throw new Error(`Failed to read ${manifestPath}`);
    }

    let manifest: AgentPluginManifest;
    try {
      manifest = parseAgentPluginManifest(content);
    } catch (cause) {
      if (!(cause instanceof ZodError)) {
        throw cause;
      }
      throw new Error(
        `Failed to parse a valid agent plugin manifest at ${manifestPath}.`,
        { cause },
      );
    }

    tree.write(
      manifestPath,
      `${agentPluginManifestSchema.encode({ ...manifest, version: newVersion })}\n`,
    );

    return [
      `Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`,
    ];
  }
}
