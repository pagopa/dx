/**
 * @fileoverview Terraform Plan Storage Download - post entry point
 *
 * Runs after the job completes successfully. Deletes the remote plan bundle
 * (blob or S3 object) that was downloaded by the main step.
 *
 * Local cleanup is not required: the temp archive was already removed by
 * main.ts after extraction, and the runner itself is ephemeral.
 *
 * Connection context is read from GITHUB_STATE, written by the main step.
 */

import * as core from "@actions/core";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

import { type PostState, PostStateSchema } from "./schema.js";

async function deleteFromAzure(
  storageAccount: string,
  container: string,
  blobName: string,
): Promise<void> {
  // AzureCliCredential is used explicitly to avoid DefaultAzureCredential
  // silently selecting the runner VM's Managed Identity on self-hosted runners.
  // csp-login (azure/login) always authenticates the az CLI before this step.
  const credential = new AzureCliCredential();
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

async function deleteRemote(state: PostState): Promise<void> {
  switch (state.provider) {
    case "aws":
      return deleteFromS3(
        state["aws-bucket"],
        state["aws-region"],
        state["plan-path"],
      );
    case "azure":
      return deleteFromAzure(
        state["azure-storage-account"],
        state["azure-container"],
        state["plan-path"],
      );
  }
}

async function run(): Promise<void> {
  const result = PostStateSchema.safeParse({
    "aws-bucket": core.getState("aws-bucket"),
    "aws-region": core.getState("aws-region"),
    "azure-container": core.getState("azure-container"),
    "azure-storage-account": core.getState("azure-storage-account"),
    "plan-path": core.getState("plan-path"),
    provider: core.getState("provider"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  await deleteRemote(result.data);
}

run().catch(core.setFailed);
