/**
 * @fileoverview Ephemeral Cloud Download - post entry point
 *
 * Runs after the job completes successfully. Deletes:
 *   1. The remote object on Azure Blob Storage or S3
 *   2. The local downloaded file
 *
 * Connection context is read from GITHUB_STATE, written by the main step.
 */

import * as core from "@actions/core";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "node:fs/promises";

import { type Context, ContextSchema } from "./schema.js";

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

async function deleteRemote(ctx: Context): Promise<void> {
  switch (ctx.provider) {
    case "aws":
      return deleteFromS3(ctx["aws-bucket"], ctx["aws-region"], ctx.source);
    case "azure":
      return deleteFromAzure(
        ctx["azure-storage-account"],
        ctx["azure-container"],
        ctx.source,
      );
  }
}

async function run(): Promise<void> {
  const result = ContextSchema.safeParse({
    "aws-bucket": core.getState("aws-bucket"),
    "aws-region": core.getState("aws-region"),
    "azure-container": core.getState("azure-container"),
    "azure-storage-account": core.getState("azure-storage-account"),
    "file-path": core.getState("file-path"),
    provider: core.getState("provider"),
    source: core.getState("source"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const ctx = result.data;

  await deleteRemote(ctx);

  // Delete local file (runner is ephemeral but clean up anyway)
  try {
    await fs.unlink(ctx["file-path"]);
    core.info(`Deleted local file: ${ctx["file-path"]}`);
  } catch {
    core.info(`Local file already gone or never written: ${ctx["file-path"]}`);
  }
}

run().catch(core.setFailed);
