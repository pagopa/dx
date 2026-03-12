/**
 * @fileoverview Cloud Storage Download - post entry point
 *
 * Runs after the job completes successfully. Deletes:
 *   1. The remote object on Azure Blob Storage or S3
 *   2. The local downloaded file
 *
 * Connection details are read from GITHUB_STATE, written by the main step.
 */

import * as core from "@actions/core";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "node:fs/promises";
import path from "node:path";

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

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  core.info(`Deleted remote object: s3://${bucket}/${key}`);
}

async function run(): Promise<void> {
  // Read state written by the main step — inputs are not available in post.
  const provider = core.getState("provider");
  const source = core.getState("source");
  const filePath = core.getState("file-path");

  // Validate the file path to prevent path-traversal attacks.
  validateFilePath(filePath);

  // Delete remote object
  switch (provider) {
    case "aws": {
      const bucket = core.getState("aws-bucket");
      const region = core.getState("aws-region");
      await deleteFromS3(bucket, region, source);
      break;
    }
    case "azure": {
      const storageAccount = core.getState("azure-storage-account");
      const container = core.getState("azure-container");
      await deleteFromAzure(storageAccount, container, source);
      break;
    }
    default:
      core.warning(
        `Unexpected provider '${provider}'. Skipping remote deletion.`,
      );
  }

  // Delete local file (runner is ephemeral but clean up anyway)
  try {
    await fs.unlink(filePath);
    core.info(`Deleted local file: ${filePath}`);
  } catch {
    core.info(`Local file already gone or never written: ${filePath}`);
  }
}

/**
 * Validates that a local file path is safe, preventing path-traversal attacks.
 * @param filePath - The file path to validate
 * @throws Error if the path is unsafe
 */
function validateFilePath(filePath: string): void {
  if (!filePath) {
    throw new Error("file-path state is empty — cannot clean up.");
  }

  const absolutePath = path.resolve(filePath);
  const sensitivePatterns = [
    "/etc/",
    "/proc/",
    "/sys/",
    "/.ssh/",
    "/.env",
    "id_rsa",
    "id_dsa",
    "authorized_keys",
  ];

  const normalizedPath = absolutePath.toLowerCase();
  for (const pattern of sensitivePatterns) {
    if (normalizedPath.includes(pattern)) {
      throw new Error(
        `file-path "${filePath}" contains potentially sensitive pattern "${pattern}" — aborting cleanup.`,
      );
    }
  }
}

run().catch(core.setFailed);
