/**
 * Registers tenant-qualified deployment environments in the repository
 * `nx.json`, so the Nx Terraform plugin tags their projects with
 * `env:<name>` instead of falling back to the default environment tag.
 *
 * Lifecycle environments (`dev`, `uat`, `prod`) are recognized by the plugin
 * out of the box and never need an entry.
 */
import { getLogger } from "@logtape/logtape";
import { execa } from "execa";
import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { z } from "zod/v4";

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

/** Minimal shape of the installed oxfmt manifest needed to locate its bin. */
const oxfmtManifestSchema = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]),
});

/**
 * Returns the updated `nx.json` content, or `undefined` when the file does not
 * need any change: lifecycle environments, repositories without the Nx
 * Terraform plugin, already-registered environments, and unreadable or
 * invalid files are left untouched.
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
    return undefined;
  }

  const plugin = findNxTerraformPlugin(parsed.nxJson);
  if (plugin === undefined || plugin.environments.includes(environmentName)) {
    return undefined;
  }

  return addNxTerraformEnvironment(
    nxJsonContent,
    plugin.index,
    plugin.environments,
    environmentName,
  );
};

/**
 * Formats the file with the repository's own oxfmt, when installed.
 *
 * The CLI does not depend on oxfmt, and repositories scaffolded before the
 * formatter was introduced do not install it: formatting is best-effort, and
 * the written file is valid JSON either way.
 */
export const formatWithRepositoryOxfmt = async (
  repositoryRoot: string,
  filePath: string,
): Promise<void> => {
  const logger = getLogger(["gen", "env"]);
  let oxfmtBinary: string;
  try {
    const require = createRequire(path.join(repositoryRoot, "package.json"));
    const packageJsonPath = require.resolve("oxfmt/package.json");
    const { bin } = oxfmtManifestSchema.parse(
      JSON.parse(await fs.readFile(packageJsonPath, "utf8")),
    );
    const binary = typeof bin === "string" ? bin : bin["oxfmt"];
    oxfmtBinary = path.resolve(path.dirname(packageJsonPath), binary);
  } catch {
    logger.debug("oxfmt is not installed, skipping the formatting of {file}", {
      file: path.relative(repositoryRoot, filePath),
    });
    return;
  }

  try {
    await execa(
      "node",
      [oxfmtBinary, path.relative(repositoryRoot, filePath)],
      {
        cwd: repositoryRoot,
      },
    );
  } catch (error) {
    // A formatting failure must not abort the environment generation: the
    // written file is already valid JSON.
    logger.debug("Could not format {file}: {error}", {
      error: error instanceof Error ? error.message : String(error),
      file: path.relative(repositoryRoot, filePath),
    });
  }
};

export const syncNxAdditionalEnvironments = async (
  environmentName: Environment["name"],
  repositoryRoot: string = process.cwd(),
): Promise<string> => {
  const nxJsonPath = path.join(repositoryRoot, "nx.json");
  let nxJsonContent: string;
  try {
    nxJsonContent = await fs.readFile(nxJsonPath, "utf8");
  } catch {
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
  await formatWithRepositoryOxfmt(repositoryRoot, nxJsonPath);
  return `Registered env:${environmentName} in the Nx Terraform additional environments`;
};

export default function (plop: NodePlopAPI): void {
  plop.setActionType("syncNxAdditionalEnvironments", async (data) => {
    const payload: Payload = payloadSchema.parse(data);
    return syncNxAdditionalEnvironments(payload.env.name);
  });
}
