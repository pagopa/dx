/**
 * @fileoverview Cloud Storage Upload - main entry point
 *
 * Uploads a local file to Azure Blob Storage or Amazon S3.
// Always attaches an ephemeral tag so that storage lifecycle rules can
 * reclaim objects that were never explicitly deleted (e.g. after a failed apply).
 * Optionally attaches a workflow-run-url tag for traceability.
 */

import * as core from "@actions/core";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
  Tag,
} from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import { resolve } from "path";

// Fixed tag applied to every uploaded object so that storage lifecycle rules
// can reclaim objects that were never explicitly deleted (e.g. after a failed
// workflow run). Pair with an Azure Management Policy or an S3 Lifecycle Rule
// that filters on this tag.
const DX_EPHEMERAL_TAG = { key: "gh-action-ephemeral", value: "true" };

async function uploadToAzure(
  storageAccount: string,
  container: string,
  destination: string,
  filePath: string,
  overwrite: boolean,
  workflowRunUrl: string,
): Promise<string> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const containerClient = new BlobServiceClient(
    url,
    credential,
  ).getContainerClient(container);
  const blockBlobClient = containerClient.getBlockBlobClient(destination);

  const uploadOptions = overwrite ? {} : { conditions: { ifNoneMatch: "*" } };

  await blockBlobClient.uploadFile(filePath, uploadOptions);
  core.info(
    `Uploaded → https://${storageAccount}.blob.core.windows.net/${container}/${destination}`,
  );

  // Tags are set separately: uploadFile does not support tags directly.
  const tags: Record<string, string> = {
    [DX_EPHEMERAL_TAG.key]: DX_EPHEMERAL_TAG.value,
  };
  if (workflowRunUrl) {
    tags["workflow-run-url"] = workflowRunUrl;
  }
  await blockBlobClient.setTags(tags);

  return `https://${storageAccount}.blob.core.windows.net/${container}/${destination}`;
}

async function uploadToS3(
  bucket: string,
  region: string,
  destination: string,
  filePath: string,
  workflowRunUrl: string,
): Promise<string> {
  const client = new S3Client({ region });
  const body = await readFile(filePath);

  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: destination, Body: body }),
  );
  core.info(`Uploaded → s3://${bucket}/${destination}`);

  // Always include gh-action-ephemeral so that a bucket lifecycle rule can reclaim
  // objects that were never explicitly deleted.
  const tagSet: Tag[] = [
    { Key: DX_EPHEMERAL_TAG.key, Value: DX_EPHEMERAL_TAG.value },
  ];
  if (workflowRunUrl) {
    tagSet.push({ Key: "workflow-run-url", Value: workflowRunUrl });
  }
  await client.send(
    new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: destination,
      Tagging: { TagSet: tagSet },
    }),
  );

  return `s3://${bucket}/${destination}`;
}

async function run(): Promise<void> {
  const provider = core.getInput("provider", { required: true });
  const filePath = resolve(core.getInput("file-path", { required: true }));
  const destination = core.getInput("destination", { required: true });
  const overwrite = core.getInput("overwrite") !== "false";
  const workflowRunUrl = core.getInput("workflow-run-url");

  let remoteUrl: string;

  switch (provider) {
    case "azure": {
      const storageAccount = core.getInput("azure-storage-account", {
        required: true,
      });
      const container = core.getInput("azure-container", { required: true });
      remoteUrl = await uploadToAzure(
        storageAccount,
        container,
        destination,
        filePath,
        overwrite,
        workflowRunUrl,
      );
      break;
    }
    case "aws": {
      const bucket = core.getInput("aws-bucket", { required: true });
      const region = core.getInput("aws-region", { required: true });
      remoteUrl = await uploadToS3(
        bucket,
        region,
        destination,
        filePath,
        workflowRunUrl,
      );
      break;
    }
    default:
      throw new Error(
        `Unsupported provider '${provider}'. Accepted values are 'azure' and 'aws'.`,
      );
  }

  core.setOutput("remote-url", remoteUrl);
}

run().catch(core.setFailed);
