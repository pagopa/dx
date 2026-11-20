import type { TerraformBackendConfiguration } from "./hcl-terraform-backend.js";

import { type CloudAccountService } from "../../domain/cloud-account.js";
import { type EnvironmentId } from "../../domain/environment.js";
import {
  type TerraformBackend,
  terraformStateContainerName,
} from "../../domain/remote-backend.js";
import { terraformStateKey } from "../plop/helpers/terraform-state-key.js";

export type TerraformBackendSetup = {
  backend: TerraformBackend;
  backendConfigFiles: {
    bootstrapper?: string;
    core?: string;
  };
  backendKey: string;
  coreBackend: TerraformBackend & { key: string };
};

export const configureTerraformBackendAccess = async (
  cloudAccountService: CloudAccountService,
  backend: TerraformBackend,
  environment: EnvironmentId,
  configuredBackend?: TerraformBackendConfiguration,
  configuredCoreBackend?: TerraformBackendConfiguration,
): Promise<TerraformBackendSetup> => {
  const coreBackend = configuredCoreBackend
    ? { ...configuredCoreBackend.backend, key: configuredCoreBackend.key }
    : {
        ...backend,
        containerName: terraformStateContainerName(environment.prefix),
        key: terraformStateKey("core"),
      };

  await cloudAccountService.ensureTerraformBackendAccess(
    backend,
    configuredCoreBackend
      ? []
      : [{ ...backend, containerName: coreBackend.containerName }],
  );
  if (configuredCoreBackend) {
    await cloudAccountService.verifyTerraformBackendReadAccess(
      configuredCoreBackend.backend,
      coreBackend.key,
    );
  }

  return {
    backend,
    backendConfigFiles: {
      bootstrapper: configuredBackend?.filePath,
      core: configuredCoreBackend?.filePath,
    },
    backendKey: configuredBackend?.key ?? terraformStateKey("bootstrapper"),
    coreBackend,
  };
};
