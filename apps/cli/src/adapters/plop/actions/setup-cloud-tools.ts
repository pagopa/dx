/**
 * Adds the cloud command-line tools required by deployment environments to the
 * generated repository's mise toolchain.
 */
import type { NodePlopAPI } from "node-plop";

import { $ as execa$ } from "execa";

const setupCloudTools = async (cwd: string = process.cwd()): Promise<void> => {
  const $ = execa$({ cwd });
  // Azure CLI's current PyPI dependencies need a managed Python 3.14 interpreter.
  await $`mise use ${"aws-cli[symlink_bins=true]@2"} ${"python@3.14"} ${"uv@latest"} ${'azure-cli[dependency_prereleases=allow,depends=["uv"]]@2'}`;
};

export const setSetupCloudToolsAction = (plop: NodePlopAPI): void => {
  plop.setActionType("setupCloudTools", async () => {
    await setupCloudTools();
    return "Cloud CLI tools configured";
  });
};
