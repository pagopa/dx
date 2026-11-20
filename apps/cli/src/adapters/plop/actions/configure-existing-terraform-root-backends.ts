import { type NodePlopAPI } from "node-plop";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

import { type EnvironmentId } from "../../../domain/environment.js";
import {
  type TerraformBackend,
  terraformBackendSchema,
} from "../../../domain/remote-backend.js";
import {
  discoverEnvironmentTerraformRoots,
  type ExistingTerraformRoot,
} from "../../terraform/hcl-terraform-backend.js";
import { payloadSchema } from "../generators/environment/prompts.js";
import { terraformStateKey } from "../helpers/terraform-state-key.js";
import { resolveTemplatesPath } from "../templates-path.js";

const isMissingFile = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  cause.code === "ENOENT";

const assertUniqueStateKeys = (
  roots: ExistingTerraformRoot[],
  defaultBackend?: TerraformBackend,
): void => {
  const stateLocations = new Map<string, string>();
  const projectRoots = new Map<string, string>();
  for (const root of roots) {
    const rootIdentity = `${root.layer}/${root.relativePath ?? ""}`;
    const existingProjectRoot = projectRoots.get(rootIdentity);
    if (existingProjectRoot) {
      throw new Error(
        `Terraform roots ${existingProjectRoot} and ${root.root} both represent ${rootIdentity}; resolve the layout manually.`,
      );
    }
    projectRoots.set(rootIdentity, root.root);

    const key =
      root.backendConfiguration?.key ??
      terraformStateKey(root.layer, root.relativePath);
    const rootBackend = root.backendConfiguration?.backend ?? defaultBackend;
    if (!rootBackend) {
      continue;
    }
    const location = [
      rootBackend.subscriptionId.toLowerCase(),
      rootBackend.resourceGroupName.toLowerCase(),
      rootBackend.storageAccountName.toLowerCase(),
      rootBackend.containerName.toLowerCase(),
      key,
    ].join("/");
    const existingRoot = stateLocations.get(location);
    if (existingRoot) {
      throw new Error(
        `Terraform roots ${existingRoot} and ${root.root} resolve to the same state key "${key}"; resolve the layout manually.`,
      );
    }
    stateLocations.set(location, root.root);
  }
};

const backendConflictingFiles = [
  "backend.tf",
  "terraform.tfstate",
  "terraform.tfstate.backup",
  ".terraform/terraform.tfstate",
  ".terraform/terraform.tfstate.backup",
];

const assertBackendCanBeAdded = async (root: string): Promise<void> => {
  for (const file of backendConflictingFiles) {
    try {
      await fs.access(path.join(root, file), constants.F_OK);
    } catch (cause) {
      if (isMissingFile(cause)) continue;
      throw new Error(`Cannot inspect ${path.join(root, file)}.`, { cause });
    }
    throw new Error(
      file === "backend.tf"
        ? `Cannot add a Terraform backend to ${root}: backend.tf already exists without a backend block.`
        : `Cannot add a remote Terraform backend to ${root}: local Terraform state or backend metadata exists (${file}). Migrate it explicitly before adding a remote backend.`,
    );
  }
};

export const validateExistingTerraformRootBackends = async (
  projectRoot: string,
  environment: EnvironmentId,
  workspaceDomain: string,
): Promise<ExistingTerraformRoot[]> => {
  const roots = await discoverEnvironmentTerraformRoots(
    projectRoot,
    environment.name,
    workspaceDomain,
  );
  assertUniqueStateKeys(roots);
  await Promise.all(
    roots
      .filter((root) => root.backendConfiguration === undefined)
      .map(({ root }) => assertBackendCanBeAdded(root)),
  );
  return roots;
};

export default (plop: NodePlopAPI): void => {
  plop.setActionType("configureExistingTerraformRootBackends", async (data) => {
    const payload = payloadSchema.parse(data);
    const { terraform } = z
      .object({
        terraform: z.object({
          backend: terraformBackendSchema,
          backendKey: z.string().min(1),
          coreBackend: terraformBackendSchema.and(
            z.object({ key: z.string().min(1) }),
          ),
        }),
      })
      .parse(data);
    const { backend, backendKey, coreBackend } = terraform;
    const roots = (
      await validateExistingTerraformRootBackends(
        process.cwd(),
        payload.env,
        payload.workspace.domain,
      )
    ).filter((root) => root.layer !== "bootstrapper" && root.layer !== "core");
    const generatedRoots = [
      { backend, key: backendKey, layer: "bootstrapper" },
      { backend: coreBackend, key: coreBackend.key, layer: "core" },
    ].map(({ backend, key, layer }) => {
      const root = path.join(process.cwd(), "infra", layer, payload.env.name);
      return {
        backendConfiguration: {
          backend,
          filePath: path.join(root, "backend.tf"),
          key,
        },
        layer,
        root,
      };
    });
    assertUniqueStateKeys([...roots, ...generatedRoots], backend);
    const template = await fs.readFile(
      path.join(
        resolveTemplatesPath("environment"),
        "shared",
        "backend.tf.hbs",
      ),
      "utf8",
    );
    for (const root of roots.filter((root) => !root.backendConfiguration)) {
      const backendFile = path.join(root.root, "backend.tf");
      try {
        await fs.writeFile(
          backendFile,
          plop.renderString(template, {
            terraform: {
              backend,
              backendKey: terraformStateKey(root.layer, root.relativePath),
            },
          }),
          { flag: "wx" },
        );
      } catch (cause) {
        throw new Error(
          `Cannot create Terraform backend configuration ${backendFile}.`,
          { cause },
        );
      }
    }
    return "Existing Terraform root backends configured";
  });
};
