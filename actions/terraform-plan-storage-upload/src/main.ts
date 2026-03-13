/**
 * @fileoverview Terraform Plan Storage Upload - main entry point
 *
 * Reads the Terraform backend configuration from `.terraform/terraform.tfstate`,
 * bundles the plan file together with `.terraform.lock.hcl` and
 * `.terraform/modules/` into a `.tar.gz` archive, uploads it to the same
 * cloud storage used for the Terraform state, and exposes the storage
 * coordinates as action outputs.
 *
 * Optional bundle entries (e.g. `.terraform/modules/` in module-less projects)
 * are silently skipped if they do not exist.
 */

import * as core from "@actions/core";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import { type Inputs, InputsSchema } from "./schema.js";

// --------------------------------------------------------------------------
// Backend tfstate schema
// --------------------------------------------------------------------------

const AzurermBackendSchema = z.object({
  config: z.object({
    container_name: z.string().min(1),
    key: z.string().min(1),
    storage_account_name: z.string().min(1),
  }),
  type: z.literal("azurerm"),
});

const S3BackendSchema = z.object({
  config: z.object({
    bucket: z.string().min(1),
    key: z.string().min(1),
    region: z.string().min(1),
  }),
  type: z.literal("s3"),
});

const TfStateSchema = z.object({
  backend: z.discriminatedUnion("type", [
    AzurermBackendSchema,
    S3BackendSchema,
  ]),
});

type TfState = z.infer<typeof TfStateSchema>;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Computes the remote plan bundle path relative to the state key.
 * Example: "prod/terraform.tfstate" → "prod/plan-artifacts/terraform.tfstate.<runId>"
 */
function computePlanPath(stateKey: string, runId: string): string {
  const stateDir = path.posix.dirname(stateKey);
  const stateBasename = path.posix.basename(stateKey);
  if (stateDir === ".") {
    return `plan-artifacts/${stateBasename}.${runId}`;
  }
  return `${stateDir}/plan-artifacts/${stateBasename}.${runId}`;
}

/**
 * Creates a `.tar.gz` archive of the plan file plus optional Terraform artefacts.
 * Entries that do not exist under `workingDirectory` are skipped with a warning.
 */
async function createBundle(
  inputs: Inputs,
  workingDirectory: string,
): Promise<{ archivePath: string; tmpDir: string }> {
  const BUNDLE_ENTRIES = [
    inputs["plan-file"],
    ".terraform.lock.hcl",
    ".terraform/modules/",
  ];

  const absoluteWorkingDir = path.isAbsolute(workingDirectory)
    ? workingDirectory
    : path.resolve(
        process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
        workingDirectory,
      );

  const existingPaths: string[] = [];
  for (const entry of BUNDLE_ENTRIES) {
    const absolute = path.join(absoluteWorkingDir, entry);
    try {
      await fs.access(absolute);
      existingPaths.push(entry);
    } catch {
      core.warning(`Skipping "${entry}": not found at ${absolute}`);
    }
  }

  if (existingPaths.length === 0) {
    throw new Error(
      "No files to bundle: all entries in the plan bundle are missing",
    );
  }

  // Use mkdtemp for a cryptographically random temp directory to avoid
  // insecure predictable temp file names (CWE-377).
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tf-bundle-"));
  const archivePath = path.join(tmpDir, "bundle.tar.gz");
  execFileSync("tar", [
    "czf",
    archivePath,
    "-C",
    absoluteWorkingDir,
    ...existingPaths,
  ]);
  core.info(`Bundled ${existingPaths.join(", ")} into ${archivePath}`);
  return { archivePath, tmpDir };
}

/**
 * Parses `.terraform/terraform.tfstate` from the given working directory.
 */
async function readBackendConfig(workingDirectory: string): Promise<TfState> {
  const tfstatePath = path.join(
    workingDirectory,
    ".terraform",
    "terraform.tfstate",
  );
  const raw = await fs.readFile(tfstatePath, "utf8");
  const json: unknown = JSON.parse(raw);
  const result = TfStateSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Failed to parse .terraform/terraform.tfstate: ${result.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return result.data;
}

async function run(): Promise<void> {
  const result = InputsSchema.safeParse({
    "plan-file": core.getInput("plan-file"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }

  const inputs = result.data;

  const runId = process.env["GITHUB_RUN_ID"];
  if (!runId) {
    throw new Error("GITHUB_RUN_ID environment variable is not set");
  }

  const absoluteWorkingDir = path.isAbsolute(inputs["working-directory"])
    ? inputs["working-directory"]
    : path.resolve(
        process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
        inputs["working-directory"],
      );

  const tfState = await readBackendConfig(absoluteWorkingDir);
  const planPath = computePlanPath(tfState.backend.config.key, runId);

  const { archivePath, tmpDir } = await createBundle(inputs, absoluteWorkingDir);
  try {
    switch (tfState.backend.type) {
      case "azurerm": {
        const { container_name, storage_account_name } = tfState.backend.config;
        await uploadToAzure(
          storage_account_name,
          container_name,
          planPath,
          archivePath,
        );
        core.setOutput("provider", "azure");
        core.setOutput("plan-path", planPath);
        core.setOutput("azure-storage-account", storage_account_name);
        core.setOutput("azure-container", container_name);
        core.setOutput("aws-bucket", "");
        core.setOutput("aws-region", "");
        break;
      }
      case "s3": {
        const { bucket, region } = tfState.backend.config;
        await uploadToS3(bucket, region, planPath, archivePath);
        core.setOutput("provider", "aws");
        core.setOutput("plan-path", planPath);
        core.setOutput("azure-storage-account", "");
        core.setOutput("azure-container", "");
        core.setOutput("aws-bucket", bucket);
        core.setOutput("aws-region", region);
        break;
      }
    }
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }
}

async function uploadToAzure(
  storageAccount: string,
  container: string,
  destination: string,
  archivePath: string,
): Promise<void> {
  const credential = new DefaultAzureCredential();
  const url = `https://${storageAccount}.blob.core.windows.net`;
  const blockBlobClient = new BlobServiceClient(url, credential)
    .getContainerClient(container)
    .getBlockBlobClient(destination);

  await blockBlobClient.uploadFile(archivePath);
  core.info(
    `Uploaded → https://${storageAccount}.blob.core.windows.net/${container}/${destination}`,
  );
}

async function uploadToS3(
  bucket: string,
  region: string,
  destination: string,
  archivePath: string,
): Promise<void> {
  const client = new S3Client({ region });
  const body = await fs.readFile(archivePath);
  await client.send(
    new PutObjectCommand({ Body: body, Bucket: bucket, Key: destination }),
  );
  core.info(`Uploaded → s3://${bucket}/${destination}`);
}

// --------------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------------

run().catch(core.setFailed);
