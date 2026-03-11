/**
 * @fileoverview Cloud Storage Upload - main entry point
 *
 * Uploads a local file to Azure Blob Storage or Amazon S3.
// Always attaches an ephemeral tag so that storage lifecycle rules can
 * reclaim objects that were never explicitly deleted (e.g. after a failed apply).
 * Optionally attaches a workflow-run-url tag for traceability.
 */

import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { readFile } from "fs/promises";
import { resolve } from "path";

// Upload action: does not rely on object tagging (some CI identities cannot set tags).
// The upload destination is provided by the caller; the workflow places plans
// under a `plan-artifacts/` folder next to the state file.

async function run(): Promise<void> {
  const provider = core.getInput("provider", { required: true });
  const filePath = resolve(core.getInput("file-path", { required: true }));
  const destination = core.getInput("destination", { required: true });
  const overwrite = core.getInput("overwrite") !== "false";
  // Intentionally not reading `workflow-run-url` to keep permissions minimal.

  let remoteUrl: string;

  switch (provider) {
    case "aws": {
      const bucket = core.getInput("aws-bucket", { required: true });
      const region = core.getInput("aws-region", { required: true });
      remoteUrl = await uploadToS3(bucket, region, destination, filePath);
      break;
    }
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

async function uploadToAzure(
  storageAccount: string,
  container: string,
  destination: string,
  filePath: string,
  overwrite: boolean,
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

  // No tagging: caller controls destination layout. Optionally keep workflow-run-url
  // in blob metadata if needed in the future (not set here to preserve minimal perms).

  return `https://${storageAccount}.blob.core.windows.net/${container}/${destination}`;
}

async function uploadToS3(
  bucket: string,
  region: string,
  destination: string,
  filePath: string,
): Promise<string> {
  const client = new S3Client({ region });
  const body = await readFile(filePath);

  await client.send(
    new PutObjectCommand({ Body: body, Bucket: bucket, Key: destination }),
  );
  core.info(`Uploaded → s3://${bucket}/${destination}`);

  // No tagging performed here. Keep upload minimal to respect least-privilege roles.

  return `s3://${bucket}/${destination}`;
}

run().catch(core.setFailed);
