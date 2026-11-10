import { getLogger } from "@logtape/logtape";
import { type NodePlopAPI } from "node-plop";
import path from "node:path";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import { getTerraformBackend } from "../../../domain/environment.js";
import { configureTerraformBackendAccess } from "../../terraform/configure-backends.js";
import { readTerraformBackendConfiguration } from "../../terraform/hcl-terraform-backend.js";
import { payloadSchema } from "../generators/environment/prompts.js";
import { validateExistingTerraformRootBackends } from "./configure-existing-terraform-root-backends.js";

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("validateTerraformBackendRoots", async (data) => {
    const payload = payloadSchema.parse(data);
    const roots = await validateExistingTerraformRootBackends(
      process.cwd(),
      payload.env,
      payload.workspace.domain,
    );
    const configuredCore = await readTerraformBackendConfiguration(
      process.cwd(),
      "core",
      payload.env.name,
      payload.workspace.domain,
    );
    data.terraform ??= {};
    data.terraform.generateCore =
      !!payload.init ||
      (!configuredCore && !roots.some((root) => root.layer === "core"));
    const layers = data.terraform.generateCore
      ? (["bootstrapper", "core"] as const)
      : (["bootstrapper"] as const);

    for (const layer of layers) {
      const generatedRoot = path.join("infra", layer, payload.env.name);
      const nestedRoot = roots.find(
        (root) =>
          root.layer === layer &&
          path.resolve(root.root) !== path.resolve(generatedRoot),
      );
      if (nestedRoot) {
        throw new Error(
          `Existing Terraform root is in ${path.relative(process.cwd(), nestedRoot.root)}, but this command generates ${generatedRoot}; refusing to create a second root. Resolve the root layout manually before retrying.`,
        );
      }

      const configuration =
        layer === "core"
          ? configuredCore
          : await readTerraformBackendConfiguration(
              process.cwd(),
              layer,
              payload.env.name,
              payload.workspace.domain,
            );
      if (!configuration) {
        continue;
      }

      const existingRoot = path.dirname(configuration.filePath);
      if (path.normalize(existingRoot) !== path.normalize(generatedRoot)) {
        throw new Error(
          `Existing Terraform backend is in ${existingRoot}, but this command generates ${generatedRoot}; refusing to create a second root. Resolve the root layout manually before retrying.`,
        );
      }
    }

    return "Terraform Backend Roots Validated";
  });

  plop.setActionType("getTerraformBackend", async (data) => {
    const logger = getLogger(["gen", "env"]);
    if (
      data.terraform?.backend &&
      data.terraform?.backendKey &&
      data.terraform?.coreBackend
    ) {
      return "Terraform Backend Retrieved";
    }
    const payload = payloadSchema.parse(data);
    const [configuredBackend, configuredCoreBackend] = await Promise.all([
      readTerraformBackendConfiguration(
        process.cwd(),
        "bootstrapper",
        payload.env.name,
        payload.workspace.domain,
      ),
      readTerraformBackendConfiguration(
        process.cwd(),
        "core",
        payload.env.name,
        payload.workspace.domain,
      ),
    ]);
    const backend =
      configuredBackend?.backend ??
      (await getTerraformBackend(
        cloudAccountService,
        payload.env,
        payload.workspace.domain,
      ));
    if (backend) {
      const setup = await configureTerraformBackendAccess(
        cloudAccountService,
        backend,
        payload.env,
        configuredBackend,
        configuredCoreBackend,
      );
      data.terraform ??= {};
      data.terraform.backendKey = setup.backendKey;
      data.terraform.backendConfigFiles = setup.backendConfigFiles;
      data.terraform.coreBackend = setup.coreBackend;
    }
    logger.debug("Retrieved terraform backend {backend}", { backend });
    data.terraform ??= {};
    data.terraform.backend = backend;
    return "Terraform Backend Retrieved";
  });
}
