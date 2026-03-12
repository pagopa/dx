/**
 * @fileoverview Cloud Storage Upload - main entry point
 *
 * Uploads a local file to Azure Blob Storage or Amazon S3.
 * The upload destination is provided by the caller; the workflow places plans
 * under a `plan-artifacts/` folder next to the state file.
 */

import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "node:fs/promises";
import path from "node:path";

import { type Inputs, InputsSchema } from "./schema.js";

async function run(): Promise<void> {
  const result = InputsSchema.safeParse({
    "aws-bucket": core.getInput("aws-bucket"),
    "aws-region": core.getInput("aws-region"),
    "azure-container": core.getInput("azure-container"),
    "azure-storage-account": core.getInput("azure-storage-account"),
    destination: core.getInput("destination"),
    "file-path": core.getInput("file-path"),
    provider: core.getInput("provider"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const remoteUrl = await upload(result.data);
  core.setOutput("remote-url", remoteUrl);
}

async function upload(inputs: Inputs): Promise<string> {
  const filePath = path.resolve(inputs["file-path"]);

  switch (inputs.provider) {
    case "aws":
      return uploadToS3(
        inputs["aws-bucket"],
        inputs["aws-region"],
        inputs.destination,
        filePath,
      );
    case "azure":
      return uploadToAzure(
        inputs["azure-storage-account"],
        inputs["azure-container"],
        inputs.destination,
        filePath,
      );
  }
}

async function uploadToAzure(
  storageAccount: string,
  container: string,
  destination: string,
  filePath: string,
): Promise<string> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blockBlobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlockBlobClient(destination);

  await blockBlobClient.uploadFile(filePath);
  core.info(
    `Uploaded → https://${storageAccount}.blob.core.windows.net/${container}/${destination}`,
  );

  return `https://${storageAccount}.blob.core.windows.net/${container}/${destination}`;
}

async function uploadToS3(
  bucket: string,
  region: string,
  destination: string,
  filePath: string,
): Promise<string> {
  const client = new S3Client({ region });
  const body = await fs.readFile(filePath);

  await client.send(
    new PutObjectCommand({ Body: body, Bucket: bucket, Key: destination }),
  );
  core.info(`Uploaded → s3://${bucket}/${destination}`);

  return `s3://${bucket}/${destination}`;
}

run().catch(core.setFailed);
