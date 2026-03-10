/**
 * @fileoverview Cloud Storage Download - main entry point
 *
 * Downloads a file from Azure Blob Storage or Amazon S3.
 * Saves connection state for the post step so it can delete
 * the remote object and the local file after the job completes.
 */

import * as core from "@actions/core";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

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

  await mkdir(dirname(filePath), { recursive: true });

  // downloadToBuffer is simpler than streaming for the small files (Terraform plans)
  const buffer = await blobClient.downloadToBuffer();
  await writeFile(filePath, buffer);

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

  await mkdir(dirname(filePath), { recursive: true });
  const bytes = await response.Body.transformToByteArray();
  await writeFile(filePath, bytes);

  core.info(`Downloaded ← s3://${bucket}/${key}`);
}

async function run(): Promise<void> {
  const provider = core.getInput("provider", { required: true });
  const source = core.getInput("source", { required: true });
  const filePath = core.getInput("file-path", { required: true });
  const deleteOnCompletion = core.getInput("delete-on-completion");

  // Persist all context needed by the post step via GITHUB_STATE.
  core.saveState("delete-on-completion", deleteOnCompletion);
  core.saveState("provider", provider);
  core.saveState("source", source);
  core.saveState("file-path", filePath);
  core.saveState(
    "azure-storage-account",
    core.getInput("azure-storage-account"),
  );
  core.saveState("azure-container", core.getInput("azure-container"));
  core.saveState("aws-bucket", core.getInput("aws-bucket"));
  core.saveState("aws-region", core.getInput("aws-region"));

  switch (provider) {
    case "azure": {
      const storageAccount = core.getInput("azure-storage-account", {
        required: true,
      });
      const container = core.getInput("azure-container", { required: true });
      await downloadFromAzure(storageAccount, container, source, filePath);
      break;
    }
    case "aws": {
      const bucket = core.getInput("aws-bucket", { required: true });
      const region = core.getInput("aws-region", { required: true });
      await downloadFromS3(bucket, region, source, filePath);
      break;
    }
    default:
      throw new Error(
        `Unsupported provider '${provider}'. Accepted values are 'azure' and 'aws'.`,
      );
  }

  const resolvedPath = resolve(filePath);
  core.setOutput("file-path", resolvedPath);
  core.info(`File saved to: ${resolvedPath}`);
}

run().catch(core.setFailed);
