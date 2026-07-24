/** This module stores Terraform plan bundles in the configured Terraform state backend. */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as z from "zod/mini";

const nonEmptyStringSchema = z.string().check(z.minLength(1));
const execFileAsync = promisify(execFile);

const azurermBackendSchema = z.object({
  config: z.object({
    container_name: nonEmptyStringSchema,
    key: nonEmptyStringSchema,
    storage_account_name: nonEmptyStringSchema,
  }),
  type: z.literal("azurerm"),
});

const s3BackendSchema = z.object({
  config: z.object({
    bucket: nonEmptyStringSchema,
    key: nonEmptyStringSchema,
    region: nonEmptyStringSchema,
  }),
  type: z.literal("s3"),
});

const rawTerraformStateSchema = z.object({
  backend: z.object({
    config: z.unknown(),
    type: nonEmptyStringSchema,
  }),
});

const supportedBackendTypeSchema = z.union([
  z.literal("azurerm"),
  z.literal("s3"),
]);

const terraformStateSchema = z.object({
  backend: z.discriminatedUnion("type", [
    azurermBackendSchema,
    s3BackendSchema,
  ]),
});

export interface AzurermPlanStorageBackend {
  container: string;
  storageAccount: string;
  type: "azurerm";
}

export type PlanStorageBackend =
  | AzurermPlanStorageBackend
  | S3PlanStorageBackend;

export interface S3PlanStorageBackend {
  bucket: string;
  region: string;
  type: "s3";
}

interface BundleEntry {
  absolutePath: string;
  archivePath: string;
  optional: boolean;
}

type TerraformBackendConfig = PlanStorageBackend & { key: string };

const formatZodIssues = (error: { issues: { message: string }[] }): string =>
  error.issues.map((issue) => issue.message).join("; ");

const getAbsoluteWorkingDirectory = (workingDirectory: string): string =>
  path.resolve(workingDirectory);

const getTerraformStatePath = (workingDirectory: string): string =>
  path.join(
    getAbsoluteWorkingDirectory(workingDirectory),
    ".terraform",
    "terraform.tfstate",
  );

const getValidatedTerraformState = (
  content: unknown,
  terraformStatePath: string,
): z.output<typeof terraformStateSchema> => {
  const rawTerraformStateResult = rawTerraformStateSchema.safeParse(content);

  if (!rawTerraformStateResult.success) {
    throw new Error(
      `Failed to validate Terraform backend state at "${terraformStatePath}": ${formatZodIssues(rawTerraformStateResult.error)}`,
    );
  }

  const backendType = rawTerraformStateResult.data.backend.type;
  const supportedBackendTypeResult =
    supportedBackendTypeSchema.safeParse(backendType);

  if (!supportedBackendTypeResult.success) {
    throw new Error(
      `Unsupported Terraform backend type "${backendType}" in "${terraformStatePath}"`,
    );
  }

  const terraformStateResult = terraformStateSchema.safeParse(content);

  if (!terraformStateResult.success) {
    throw new Error(
      `Failed to validate Terraform backend state at "${terraformStatePath}": ${formatZodIssues(terraformStateResult.error)}`,
    );
  }

  return terraformStateResult.data;
};

const getBackendConfig = (
  terraformState: z.output<typeof terraformStateSchema>,
): TerraformBackendConfig => {
  switch (terraformState.backend.type) {
    case "azurerm":
      return {
        container: terraformState.backend.config.container_name,
        key: terraformState.backend.config.key,
        storageAccount: terraformState.backend.config.storage_account_name,
        type: "azurerm",
      };
    case "s3":
      return {
        bucket: terraformState.backend.config.bucket,
        key: terraformState.backend.config.key,
        region: terraformState.backend.config.region,
        type: "s3",
      };
  }
};

const getPlanFileArchivePath = (
  workingDirectory: string,
  planFile: string,
): string => {
  const absolutePlanFilePath = path.isAbsolute(planFile)
    ? path.resolve(planFile)
    : path.join(workingDirectory, planFile);
  const relativePlanFilePath = path.relative(
    workingDirectory,
    absolutePlanFilePath,
  );

  if (
    relativePlanFilePath.length === 0 ||
    relativePlanFilePath.startsWith("..") ||
    path.isAbsolute(relativePlanFilePath)
  ) {
    throw new Error(
      `Plan file "${planFile}" must be located inside "${workingDirectory}"`,
    );
  }

  return relativePlanFilePath;
};

const createBundleEntries = (
  workingDirectory: string,
  planFile: string,
): readonly BundleEntry[] => {
  const planFileArchivePath = getPlanFileArchivePath(
    workingDirectory,
    planFile,
  );

  return [
    {
      absolutePath: path.join(workingDirectory, planFileArchivePath),
      archivePath: planFileArchivePath,
      optional: false,
    },
    {
      absolutePath: path.join(workingDirectory, ".terraform.lock.hcl"),
      archivePath: ".terraform.lock.hcl",
      optional: true,
    },
    {
      absolutePath: path.join(workingDirectory, ".terraform/modules"),
      archivePath: ".terraform/modules/",
      optional: true,
    },
  ];
};

const getExistingBundleEntries = async (
  entries: readonly BundleEntry[],
): Promise<string[]> => {
  const existingEntries: string[] = [];

  for (const entry of entries) {
    try {
      await fs.access(entry.absolutePath);
      existingEntries.push(entry.archivePath);
    } catch (cause) {
      if (entry.optional) {
        console.warn(
          `Skipping "${entry.archivePath}": not found at ${entry.absolutePath}`,
        );
        continue;
      }

      throw new Error(
        `Required Terraform plan bundle entry "${entry.archivePath}" was not found at "${entry.absolutePath}"`,
        { cause },
      );
    }
  }

  return existingEntries;
};

const createBundle = async (
  workingDirectory: string,
  planFile: string,
): Promise<{ archivePath: string; temporaryDirectory: string }> => {
  const bundleEntries = await getExistingBundleEntries(
    createBundleEntries(workingDirectory, planFile),
  );
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "dx-tasks-plan-storage-"),
  );
  const archivePath = path.join(temporaryDirectory, "bundle.tar.gz");

  try {
    await execFileAsync("tar", [
      "czf",
      archivePath,
      "-C",
      workingDirectory,
      ...bundleEntries,
    ]);
  } catch (cause) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw new Error(
      `Failed to create Terraform plan bundle for "${workingDirectory}"`,
      { cause },
    );
  }

  return { archivePath, temporaryDirectory };
};

const createBlobServiceClient = (storageAccount: string) =>
  new BlobServiceClient(
    `https://${storageAccount}.blob.core.windows.net`,
    // AzureCliCredential avoids accidentally selecting a managed identity.
    new AzureCliCredential(),
  );

const uploadToAzure = async (
  backend: AzurermPlanStorageBackend,
  planPath: string,
  archivePath: string,
): Promise<void> => {
  const blockBlobClient = createBlobServiceClient(backend.storageAccount)
    .getContainerClient(backend.container)
    .getBlockBlobClient(planPath);

  await blockBlobClient.uploadFile(archivePath);
};

const uploadToS3 = async (
  backend: S3PlanStorageBackend,
  planPath: string,
  archivePath: string,
): Promise<void> => {
  const client = new S3Client({ region: backend.region });
  const body = await fs.readFile(archivePath);

  await client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: backend.bucket,
      Key: planPath,
    }),
  );
};

const uploadToBackend = async (
  backend: PlanStorageBackend,
  planPath: string,
  archivePath: string,
): Promise<void> => {
  switch (backend.type) {
    case "azurerm":
      return uploadToAzure(backend, planPath, archivePath);
    case "s3":
      return uploadToS3(backend, planPath, archivePath);
  }
};

const downloadFromAzure = async (
  backend: AzurermPlanStorageBackend,
  planPath: string,
  destinationPath: string,
): Promise<void> => {
  const blobClient = createBlobServiceClient(backend.storageAccount)
    .getContainerClient(backend.container)
    .getBlobClient(planPath);
  const archive = await blobClient.downloadToBuffer();

  await fs.writeFile(destinationPath, archive, { mode: 0o600 });
};

const downloadFromS3 = async (
  backend: S3PlanStorageBackend,
  planPath: string,
  destinationPath: string,
): Promise<void> => {
  const client = new S3Client({ region: backend.region });
  const response = await client.send(
    new GetObjectCommand({
      Bucket: backend.bucket,
      Key: planPath,
    }),
  );

  if (!response.Body) {
    throw new Error(
      `Received an empty response body for s3://${backend.bucket}/${planPath}`,
    );
  }

  await fs.writeFile(
    destinationPath,
    await response.Body.transformToByteArray(),
    {
      mode: 0o600,
    },
  );
};

const downloadFromBackend = async (
  backend: PlanStorageBackend,
  planPath: string,
  destinationPath: string,
): Promise<void> => {
  switch (backend.type) {
    case "azurerm":
      return downloadFromAzure(backend, planPath, destinationPath);
    case "s3":
      return downloadFromS3(backend, planPath, destinationPath);
  }
};

const deleteFromAzure = async (
  backend: AzurermPlanStorageBackend,
  planPath: string,
): Promise<void> => {
  const blobClient = createBlobServiceClient(backend.storageAccount)
    .getContainerClient(backend.container)
    .getBlobClient(planPath);

  await blobClient.deleteIfExists();
};

const deleteFromS3 = async (
  backend: S3PlanStorageBackend,
  planPath: string,
): Promise<void> => {
  const client = new S3Client({ region: backend.region });

  await client.send(
    new DeleteObjectCommand({
      Bucket: backend.bucket,
      Key: planPath,
    }),
  );
};

export const readBackendConfig = async (
  workingDirectory: string,
): Promise<PlanStorageBackend & { key: string }> => {
  const terraformStatePath = getTerraformStatePath(workingDirectory);
  let rawTerraformState: string;

  try {
    rawTerraformState = await fs.readFile(terraformStatePath, "utf8");
  } catch (cause) {
    throw new Error(
      `Failed to read Terraform backend state from "${terraformStatePath}"`,
      { cause },
    );
  }

  let parsedTerraformState: unknown;

  try {
    parsedTerraformState = JSON.parse(rawTerraformState);
  } catch (cause) {
    throw new Error(
      `Failed to parse Terraform backend state from "${terraformStatePath}" as JSON`,
      { cause },
    );
  }

  return getBackendConfig(
    getValidatedTerraformState(parsedTerraformState, terraformStatePath),
  );
};

export const computePlanPath = (stateKey: string, runId: string): string => {
  const stateDirectory = path.posix.dirname(stateKey);
  const stateBasename = path.posix.basename(stateKey);

  if (stateDirectory === ".") {
    return `plan-artifacts/${stateBasename}.${runId}`;
  }

  return `${stateDirectory}/plan-artifacts/${stateBasename}.${runId}`;
};

export const uploadPlanBundle = async ({
  planFile,
  runId,
  workingDirectory,
}: {
  planFile: string;
  runId: string;
  workingDirectory: string;
}): Promise<{ backend: PlanStorageBackend; planPath: string }> => {
  const absoluteWorkingDirectory =
    getAbsoluteWorkingDirectory(workingDirectory);
  const { key, ...backend } = await readBackendConfig(absoluteWorkingDirectory);
  const planPath = computePlanPath(key, runId);
  const { archivePath, temporaryDirectory } = await createBundle(
    absoluteWorkingDirectory,
    planFile,
  );

  try {
    await uploadToBackend(backend, planPath, archivePath);
  } finally {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
  }

  return { backend, planPath };
};

export const downloadPlanBundle = async ({
  backend,
  planPath,
  workingDirectory,
}: {
  backend: PlanStorageBackend;
  planPath: string;
  workingDirectory: string;
}): Promise<void> => {
  const absoluteWorkingDirectory =
    getAbsoluteWorkingDirectory(workingDirectory);
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "dx-tasks-plan-storage-"),
  );
  const archivePath = path.join(temporaryDirectory, "bundle.tar.gz");

  try {
    await downloadFromBackend(backend, planPath, archivePath);
    await fs.mkdir(absoluteWorkingDirectory, { recursive: true });
    await execFileAsync("tar", [
      "xzf",
      archivePath,
      "-C",
      absoluteWorkingDirectory,
      "--no-same-owner",
      "--no-same-permissions",
    ]);
  } finally {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
  }
};

export const deleteRemotePlanBundle = async ({
  backend,
  planPath,
}: {
  backend: PlanStorageBackend;
  planPath: string;
}): Promise<void> => {
  switch (backend.type) {
    case "azurerm":
      return deleteFromAzure(backend, planPath);
    case "s3":
      return deleteFromS3(backend, planPath);
  }
};
