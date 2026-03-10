/**
 * @fileoverview Cloud Storage Download - post entry point
 *
 * Runs after the job completes (always, regardless of success/failure).
 * When delete-on-completion was set to true in the main step, deletes:
 *   1. The remote object on Azure Blob Storage or S3
 *   2. The local downloaded file
 *
 * Connection details are read from GITHUB_STATE, written by the main step.
 */

import * as core from "@actions/core";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { DeleteObjectCommand, GetObjectTaggingCommand, S3Client } from "@aws-sdk/client-s3";
import { unlink } from "fs/promises";

// Must match the tag key set by cloud-storage-upload.
const EPHEMERAL_TAG = { key: "gh-action-ephemeral", value: "true" };

async function deleteFromAzure(
  storageAccount: string,
  container: string,
  blobName: string,
): Promise<void> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlobClient(blobName);

  const { tags } = await blobClient.getTags();
  if (tags[EPHEMERAL_TAG.key] !== EPHEMERAL_TAG.value) {
    core.warning(
      `Skipping deletion: blob does not have tag '${EPHEMERAL_TAG.key}=${EPHEMERAL_TAG.value}'.`,
    );
    return;
  }

  await blobClient.deleteIfExists();
  core.info(
    `Deleted remote blob: https://${storageAccount}.blob.core.windows.net/${container}/${blobName}`,
  );
}

async function deleteFromS3(
  bucket: string,
  region: string,
  key: string,
): Promise<void> {
  const client = new S3Client({ region });

  const { TagSet = [] } = await client.send(
    new GetObjectTaggingCommand({ Bucket: bucket, Key: key }),
  );
  const isEphemeral = TagSet.some(
    (t) => t.Key === EPHEMERAL_TAG.key && t.Value === EPHEMERAL_TAG.value,
  );
  if (!isEphemeral) {
    core.warning(
      `Skipping deletion: object does not have tag '${EPHEMERAL_TAG.key}=${EPHEMERAL_TAG.value}'.`,
    );
    return;
  }

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  core.info(`Deleted remote object: s3://${bucket}/${key}`);
}

async function run(): Promise<void> {
  // Read state written by the main step — inputs are not available in post.
  const deleteOnCompletion = core.getState("delete-on-completion");

  if (deleteOnCompletion !== "true") {
    core.info("delete-on-completion is not set — skipping cleanup.");
    return;
  }

  const provider = core.getState("provider");
  const source = core.getState("source");
  const filePath = core.getState("file-path");

  // Delete remote object
  switch (provider) {
    case "azure": {
      const storageAccount = core.getState("azure-storage-account");
      const container = core.getState("azure-container");
      await deleteFromAzure(storageAccount, container, source);
      break;
    }
    case "aws": {
      const bucket = core.getState("aws-bucket");
      const region = core.getState("aws-region");
      await deleteFromS3(bucket, region, source);
      break;
    }
    default:
      core.warning(
        `Unexpected provider '${provider}'. Skipping remote deletion.`,
      );
  }

  // Delete local file (runner is ephemeral but clean up anyway)
  try {
    await unlink(filePath);
    core.info(`Deleted local file: ${filePath}`);
  } catch {
    core.info(`Local file already gone or never written: ${filePath}`);
  }
}

run().catch(core.setFailed);
