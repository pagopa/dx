import type { NodePlopAPI } from "node-plop";

import type { TerraformBackend } from "../../../domain/remote-backend.js";

const sameCoordinate = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();

export const terraformStateContainerReaderKey = (
  ownBackend: TerraformBackend,
  upstreamBackend: TerraformBackend,
): string | undefined => {
  const sameStorageAccount =
    sameCoordinate(ownBackend.subscriptionId, upstreamBackend.subscriptionId) &&
    sameCoordinate(
      ownBackend.resourceGroupName,
      upstreamBackend.resourceGroupName,
    ) &&
    sameCoordinate(
      ownBackend.storageAccountName,
      upstreamBackend.storageAccountName,
    );

  if (
    sameStorageAccount &&
    sameCoordinate(ownBackend.containerName, upstreamBackend.containerName)
  ) {
    return undefined;
  }

  if (sameStorageAccount) {
    return upstreamBackend.containerName;
  }

  return `/subscriptions/${upstreamBackend.subscriptionId}/resourceGroups/${upstreamBackend.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${upstreamBackend.storageAccountName}/blobServices/default/containers/${upstreamBackend.containerName}`;
};

export default (plop: NodePlopAPI) => {
  plop.setHelper(
    "terraformStateContainerReaderKey",
    terraformStateContainerReaderKey,
  );
};
