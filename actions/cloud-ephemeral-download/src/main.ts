/**
 * @fileoverview Ephemeral Cloud Download - main entry point
 *
 * Downloads a `.tar.gz` bundle from Azure Blob Storage or Amazon S3 into a
 * temporary file, extracts it into `extract-to`, then removes the temp archive.
 *
 * Saves only the connection context (provider + credentials + source) to
 * GITHUB_STATE so the post step can delete the remote object after the job.
 */

import * as core from "@actions/core";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { type Context, ContextSchema } from "./schema.js";

async function downloadFromAzure(
  storageAccount: string,
  container: string,
  blobName: string,
  destFile: string,
): Promise<void> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlobClient(blobName);

  await fs.mkdir(path.dirname(destFile), { recursive: true });
  const buffer = await blobClient.downloadToBuffer();
  await fs.writeFile(destFile, buffer);

  core.info(
    `Downloaded ← https://${storageAccount}.blob.core.windows.net/${container}/${blobName}`,
  );
}

async function downloadFromS3(
  bucket: string,
  region: string,
  key: string,
  destFile: string,
): Promise<void> {
  const client = new S3Client({ region });
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error("Empty response body from S3");
  }

  await fs.mkdir(path.dirname(destFile), { recursive: true });
  const bytes = await response.Body.transformToByteArray();
  await fs.writeFile(destFile, bytes);

  core.info(`Downloaded ← s3://${bucket}/${key}`);
}

async function downloadToFile(ctx: Context, destFile: string): Promise<void> {
  switch (ctx.provider) {
    case "aws":
      return downloadFromS3(
        ctx["aws-bucket"],
        ctx["aws-region"],
        ctx.source,
        destFile,
      );
    case "azure":
      return downloadFromAzure(
        ctx["azure-storage-account"],
        ctx["azure-container"],
        ctx.source,
        destFile,
      );
  }
}

async function run(): Promise<void> {
  const result = ContextSchema.safeParse({
    "aws-bucket": core.getInput("aws-bucket"),
    "aws-region": core.getInput("aws-region"),
    "azure-container": core.getInput("azure-container"),
    "azure-storage-account": core.getInput("azure-storage-account"),
    "extract-to": core.getInput("extract-to"),
    provider: core.getInput("provider"),
    source: core.getInput("source"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const ctx = result.data;

  // Persist connection context for the post step via GITHUB_STATE.
  // `extract-to` is not saved: the post step only needs to delete the remote object.
  core.saveState("provider", ctx.provider);
  core.saveState("source", ctx.source);
  if (ctx.provider === "azure") {
    core.saveState("azure-storage-account", ctx["azure-storage-account"]);
    core.saveState("azure-container", ctx["azure-container"]);
  } else {
    core.saveState("aws-bucket", ctx["aws-bucket"]);
    core.saveState("aws-region", ctx["aws-region"]);
  }

  const archivePath = path.join(os.tmpdir(), `tf-bundle-${Date.now()}.tar.gz`);
  try {
    await downloadToFile(ctx, archivePath);

    const extractTo = path.resolve(ctx["extract-to"]);
    await fs.mkdir(extractTo, { recursive: true });
    execFileSync("tar", ["xzf", archivePath, "-C", extractTo]);
    core.info(`Extracted bundle to: ${extractTo}`);
    core.setOutput("extract-to", extractTo);
  } finally {
    await fs.rm(archivePath, { force: true });
  }
}

run().catch(core.setFailed);
