/**
 * Registers tenant-qualified deployment environments in the repository
 * `nx.json`, so the Nx Terraform plugin tags their projects with
 * `env:<name>` instead of falling back to the default environment tag.
 *
 * Lifecycle environments (`dev`, `uat`, `prod`) are recognized by the plugin
 * out of the box and never need an entry.
 */
import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
import path from "node:path";

import {
  type Environment,
  getBaseEnvironmentName,
} from "../../../domain/environment.js";
import {
  addNxTerraformEnvironment,
  findNxTerraformPlugin,
  parseNxJson,
} from "../../../domain/nx-json.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

/**
 * Returns the updated `nx.json` content, or `undefined` when the file does not
 * need any change: lifecycle environments, repositories without the Nx
 * Terraform plugin, and already-registered environments.
 *
 * A file that cannot be parsed is an error: silently skipping the registration
 * would generate an environment that Nx tags with the wrong environment, so the
 * caller must abort before any repository or cloud side effect.
 */
export const syncAdditionalEnvironments = (
  nxJsonContent: string,
  environmentName: Environment["name"],
): string | undefined => {
  if (getBaseEnvironmentName(environmentName) === environmentName) {
    return undefined;
  }

  const parsed = parseNxJson(nxJsonContent);
  if (parsed.error !== undefined) {
    throw new Error(
      `Cannot register env:${environmentName} in nx.json: ${parsed.error}`,
    );
  }

  const plugin = findNxTerraformPlugin(parsed.nxJson);
  if (plugin === undefined || plugin.environments.includes(environmentName)) {
    return undefined;
  }

  return addNxTerraformEnvironment(nxJsonContent, plugin, environmentName);
};

/**
 * Returns whether the error is the "file does not exist" failure of a read.
 */
const isMissingFileError = (error: unknown): boolean =>
  error !== null &&
  typeof error === "object" &&
  "code" in error &&
  error.code === "ENOENT";

export const syncNxAdditionalEnvironments = async (
  environmentName: Environment["name"],
  repositoryRoot: string = process.cwd(),
): Promise<string> => {
  const nxJsonPath = path.join(repositoryRoot, "nx.json");
  let nxJsonContent: string;
  try {
    nxJsonContent = await fs.readFile(nxJsonPath, "utf8");
  } catch (error) {
    if (!isMissingFileError(error)) {
      // Any other failure (e.g. a permission error) must not be reported as a
      // repository without nx.json: the environment would silently miss its Nx
      // Terraform registration.
      throw error;
    }

    // Repositories scaffolded before the Nx Terraform alignment have no
    // nx.json configuration to update.
    return "No nx.json found, skipped the Nx Terraform environment registration";
  }

  const updatedNxJson = syncAdditionalEnvironments(
    nxJsonContent,
    environmentName,
  );
  if (updatedNxJson === undefined) {
    return `Environment ${environmentName} does not need a Nx Terraform environment registration`;
  }

  await fs.writeFile(nxJsonPath, updatedNxJson, "utf8");
  return `Registered env:${environmentName} in the Nx Terraform additional environments`;
};

export default function (plop: NodePlopAPI): void {
  plop.setActionType("syncNxAdditionalEnvironments", async (data) => {
    const payload: Payload = payloadSchema.parse(data);
    return syncNxAdditionalEnvironments(payload.env.name);
  });
}
