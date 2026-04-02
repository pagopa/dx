/**
 * @fileoverview Terraform Plan Storage Download - main entry point
 *
 * Downloads a `.tar.gz` plan bundle from Azure Blob Storage or Amazon S3 into
 * a temporary file, extracts it into `working-directory`, then removes the
 * temp archive.
 *
 * Accepts storage coordinates directly as inputs — no terraform init required.
 *
 * Saves the connection context (provider + credentials + plan-path) to
 * GITHUB_STATE so the post step can delete the remote bundle after the job.
 */

import * as core from "@actions/core";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AzureCliCredential } from "@azure/identity";
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
  // AzureCliCredential is used explicitly to avoid DefaultAzureCredential
  // silently selecting the runner VM's Managed Identity on self-hosted runners.
  // Azure CLI must be authenticated before this step. before this step.
  const credential = new AzureCliCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlobClient(blobName);

  await fs.mkdir(path.dirname(destFile), { recursive: true });
  const buffer = await blobClient.downloadToBuffer();
  await fs.writeFile(destFile, buffer, { mode: 0o600 });

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
  await fs.writeFile(destFile, bytes, { mode: 0o600 });

  core.info(`Downloaded ← s3://${bucket}/${key}`);
}

async function downloadToFile(ctx: Context, destFile: string): Promise<void> {
  switch (ctx.provider) {
    case "aws":
      return downloadFromS3(
        ctx["aws-bucket"],
        ctx["aws-region"],
        ctx["plan-path"],
        destFile,
      );
    case "azure":
      return downloadFromAzure(
        ctx["azure-storage-account"],
        ctx["azure-container"],
        ctx["plan-path"],
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
    "plan-path": core.getInput("plan-path"),
    provider: core.getInput("provider"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const ctx = result.data;

  // Resolve working-directory against GITHUB_WORKSPACE so the node action CWD
  // does not affect path resolution (GHA runs JS actions from the action directory).
  const extractTo = path.isAbsolute(ctx["working-directory"])
    ? ctx["working-directory"]
    : path.resolve(
        process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
        ctx["working-directory"],
      );

  // Persist connection context for the post step via GITHUB_STATE.
  // `working-directory` is not saved: the post step only needs to delete the remote object.
  core.saveState("provider", ctx.provider);
  core.saveState("plan-path", ctx["plan-path"]);
  if (ctx.provider === "azure") {
    core.saveState("azure-storage-account", ctx["azure-storage-account"]);
    core.saveState("azure-container", ctx["azure-container"]);
  } else {
    core.saveState("aws-bucket", ctx["aws-bucket"]);
    core.saveState("aws-region", ctx["aws-region"]);
  }

  // Use mkdtemp for a cryptographically random temp directory to avoid
  // insecure predictable temp file names (CWE-377).
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tf-bundle-"));
  const archivePath = path.join(tmpDir, "bundle.tar.gz");
  try {
    await downloadToFile(ctx, archivePath);

    await fs.mkdir(extractTo, { recursive: true });
    execFileSync("tar", ["xzf", archivePath, "-C", extractTo]);
    core.info(`Extracted bundle to: ${extractTo}`);
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }
}

run().catch(core.setFailed);
