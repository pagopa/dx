/**
 * @fileoverview Ephemeral Cloud Download - main entry point
 *
 * Downloads a file from Azure Blob Storage or Amazon S3.
 * Saves connection context to GITHUB_STATE for the post step, which deletes
 * the remote object and the local file after the job completes.
 */

import * as core from "@actions/core";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "node:fs/promises";
import path from "node:path";

import { type Context, ContextSchema } from "./schema.js";

async function download(ctx: Context): Promise<void> {
  switch (ctx.provider) {
    case "aws":
      return downloadFromS3(
        ctx["aws-bucket"],
        ctx["aws-region"],
        ctx.source,
        ctx["file-path"],
      );
    case "azure":
      return downloadFromAzure(
        ctx["azure-storage-account"],
        ctx["azure-container"],
        ctx.source,
        ctx["file-path"],
      );
  }
}

async function downloadFromAzure(
  storageAccount: string,
  container: string,
  blobName: string,
  filePath: string,
): Promise<void> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlobClient(blobName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // downloadToBuffer is simpler than streaming for small files (Terraform plans)
  const buffer = await blobClient.downloadToBuffer();
  await fs.writeFile(filePath, buffer);

  core.info(
    `Downloaded ← https://${storageAccount}.blob.core.windows.net/${container}/${blobName}`,
  );
}

async function downloadFromS3(
  bucket: string,
  region: string,
  key: string,
  filePath: string,
): Promise<void> {
  const client = new S3Client({ region });
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error("Empty response body from S3");
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const bytes = await response.Body.transformToByteArray();
  await fs.writeFile(filePath, bytes);

  core.info(`Downloaded ← s3://${bucket}/${key}`);
}

async function run(): Promise<void> {
  const result = ContextSchema.safeParse({
    "aws-bucket": core.getInput("aws-bucket"),
    "aws-region": core.getInput("aws-region"),
    "azure-container": core.getInput("azure-container"),
    "azure-storage-account": core.getInput("azure-storage-account"),
    "file-path": core.getInput("file-path"),
    provider: core.getInput("provider"),
    source: core.getInput("source"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const ctx = result.data;

  // Persist context for the post step via GITHUB_STATE.
  // Inputs are not available in post steps, only state is.
  core.saveState("provider", ctx.provider);
  core.saveState("source", ctx.source);
  core.saveState("file-path", ctx["file-path"]);
  if (ctx.provider === "azure") {
    core.saveState("azure-storage-account", ctx["azure-storage-account"]);
    core.saveState("azure-container", ctx["azure-container"]);
  } else {
    core.saveState("aws-bucket", ctx["aws-bucket"]);
    core.saveState("aws-region", ctx["aws-region"]);
  }

  await download(ctx);

  const resolvedPath = path.resolve(ctx["file-path"]);
  core.setOutput("file-path", resolvedPath);
  core.info(`File saved to: ${resolvedPath}`);
}

run().catch(core.setFailed);
