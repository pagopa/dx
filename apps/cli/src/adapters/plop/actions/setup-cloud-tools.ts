/**
 * Adds the cloud command-line tools required by deployment environments to the
 * generated repository's mise toolchain.
 */
import type { NodePlopAPI } from "node-plop";

import { $ as execa$ } from "execa";

const setupCloudTools = async (cwd: string = process.cwd()): Promise<void> => {
  const $ = execa$({ cwd });
  await $`mise use ${"aws-cli[symlink_bins=true]@2"} ${'azure-cli[uvx_args=--prerelease=allow,depends=["uv"]]@2'} ${"uv@latest"}`;
};

export const setSetupCloudToolsAction = (plop: NodePlopAPI): void => {
  plop.setActionType("setupCloudTools", async () => {
    await setupCloudTools();
    return "Cloud CLI tools configured";
  });
};
