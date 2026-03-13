/**
 * @fileoverview Cloud Storage Upload - main entry point
 *
 * Bundles the specified files into a `.tar.gz` archive and uploads it
 * to Azure Blob Storage or Amazon S3.
 *
 * Multiple files / directories can be provided in `file-paths` (one per line).
 * All paths are treated as relative to `working-directory`.
 * The workflow places plan bundles under a `plan-artifacts/` folder next to
 * the state file.
 */

import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { type Inputs, InputsSchema } from "./schema.js";

/**
 * Creates a temporary `.tar.gz` archive containing all entries in `file-paths`,
 * relative to `working-directory`.
 */
async function createBundle(inputs: Inputs): Promise<string> {
  const archivePath = path.join(os.tmpdir(), `tf-bundle-${Date.now()}.tar.gz`);
  execFileSync("tar", [
    "czf",
    archivePath,
    "-C",
    inputs["working-directory"],
    ...inputs["file-paths"],
  ]);
  core.info(`Bundled ${inputs["file-paths"].join(", ")} into ${archivePath}`);
  return archivePath;
}

async function run(): Promise<void> {
  const filePaths = core
    .getInput("file-paths")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = InputsSchema.safeParse({
    "aws-bucket": core.getInput("aws-bucket"),
    "aws-region": core.getInput("aws-region"),
    "azure-container": core.getInput("azure-container"),
    "azure-storage-account": core.getInput("azure-storage-account"),
    destination: core.getInput("destination"),
    "file-paths": filePaths,
    provider: core.getInput("provider"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const remoteUrl = await upload(result.data);
  core.setOutput("remote-url", remoteUrl);
}

async function upload(inputs: Inputs): Promise<string> {
  const archivePath = await createBundle(inputs);
  try {
    switch (inputs.provider) {
      case "aws":
        return await uploadToS3(
          inputs["aws-bucket"],
          inputs["aws-region"],
          inputs.destination,
          archivePath,
        );
      case "azure":
        return await uploadToAzure(
          inputs["azure-storage-account"],
          inputs["azure-container"],
          inputs.destination,
          archivePath,
        );
    }
  } finally {
    await fs.rm(archivePath, { force: true });
  }
}

async function uploadToAzure(
  storageAccount: string,
  container: string,
  destination: string,
  archivePath: string,
): Promise<string> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blockBlobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlockBlobClient(destination);

  await blockBlobClient.uploadFile(archivePath);
  core.info(
    `Uploaded → https://${storageAccount}.blob.core.windows.net/${container}/${destination}`,
  );

  return `https://${storageAccount}.blob.core.windows.net/${container}/${destination}`;
}

async function uploadToS3(
  bucket: string,
  region: string,
  destination: string,
  archivePath: string,
): Promise<string> {
  const client = new S3Client({ region });
  const body = await fs.readFile(archivePath);

  await client.send(
    new PutObjectCommand({ Body: body, Bucket: bucket, Key: destination }),
  );
  core.info(`Uploaded → s3://${bucket}/${destination}`);

  return `s3://${bucket}/${destination}`;
}

run().catch(core.setFailed);
