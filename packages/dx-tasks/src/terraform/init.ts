/** This module initializes Terraform and enforces Registry module locks. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

import type { ProcessResult } from "../run-command.ts";

import { runCommand } from "../run-command.ts";
import { compareModuleLock } from "./module-lock.ts";

const incompatibleGetArgumentError =
  "The -get=false option is incompatible with Terraform module locking";
const providerLockPlatforms = [
  "-platform=windows_amd64",
  "-platform=darwin_amd64",
  "-platform=darwin_arm64",
  "-platform=linux_amd64",
];
const providerLockFileName = ".terraform.lock.hcl";

const isTerraformFalse = (value: string): boolean =>
  /^(?:0|f(?:alse)?)$/i.test(value);

const disablesModuleDownloads = (args: readonly string[]): boolean =>
  args.some((argument, index) => {
    const inlineValue = /^--?get=(.+)$/i.exec(argument)?.[1];
    return (
      (inlineValue !== undefined && isTerraformFalse(inlineValue)) ||
      (/^--?get$/i.test(argument) &&
        args[index + 1] !== undefined &&
        isTerraformFalse(args[index + 1]))
    );
  });

const normalizeTerraformInitArguments = (args: readonly string[]): string[] => {
  const normalizedArguments: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (/^--?get=/i.test(args[index])) {
      continue;
    }
    if (/^--?get$/i.test(args[index])) {
      if (args[index + 1] !== undefined && !args[index + 1].startsWith("-")) {
        index += 1;
      }
      continue;
    }
    normalizedArguments.push(args[index]);
  }
  return normalizedArguments;
};

const terraformInitArgumentsSchema = z._default(
  z
    .array(z.string())
    .check(
      z.refine(
        (args) => !disablesModuleDownloads(args),
        incompatibleGetArgumentError,
      ),
    ),
  [],
);

const terraformInitPayloadShape = {
  args: terraformInitArgumentsSchema,
  frozenLockfile: z._default(z.boolean(), false),
  modulePath: z.string().check(z.minLength(1)),
};

export const payloadSchema = z.object(terraformInitPayloadShape);

export interface TerraformInitPayload {
  args?: string[];
  frozenLockfile?: boolean;
  modulePath: string;
}

const printTerraformOutput = (result: ProcessResult): void => {
  if (result.stdout.length > 0) {
    console.log(result.stdout);
  }
  if (result.stderr.length > 0) {
    console.error(result.stderr);
  }
};

const getTerraformFailureMessage = (
  operation: string,
  result: ProcessResult,
): string => {
  const termination =
    result.signal === null
      ? `exit code ${result.exitCode}`
      : `signal ${result.signal}`;
  const details = [result.stderr.trim(), result.stdout.trim()]
    .filter((output) => output.length > 0)
    .join("\n");
  return `terraform ${operation} failed with ${termination}${details ? `\n${details}` : ""}`;
};

const getLockChangeSummary = (
  changes: readonly { key: string; status: string }[],
  formatVersion: 1 | 2,
): string =>
  formatVersion === 1
    ? "legacy module lock format (version 1)"
    : changes.length > 0
      ? changes.map(({ key, status }) => `${status}: ${key}`).join(", ")
      : "no module hash changes";

const isFileNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const readProviderLock = async (
  modulePath: string,
): Promise<string | undefined> => {
  try {
    return await fs.readFile(
      path.join(modulePath, providerLockFileName),
      "utf8",
    );
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

const replaceFileAtomically = async (
  filePath: string,
  content: string,
  temporaryDirectoryPrefix: string,
): Promise<void> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(path.dirname(filePath), temporaryDirectoryPrefix),
  );
  const temporaryPath = path.join(temporaryDirectory, path.basename(filePath));
  try {
    await fs.writeFile(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
    });
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
  }
};

const restoreProviderLock = async (
  modulePath: string,
  content: string | undefined,
): Promise<void> => {
  const lockPath = path.join(modulePath, providerLockFileName);
  if (content === undefined) {
    await fs.rm(lockPath, { force: true });
    return;
  }
  await replaceFileAtomically(lockPath, content, ".terraform-lock-");
};

const runTerraformCommand = async (
  operation: string,
  args: string[],
  modulePath: string,
): Promise<void> => {
  const result = await runCommand("terraform", args, modulePath, {});
  printTerraformOutput(result);
  if (result.exitCode !== 0) {
    throw new Error(getTerraformFailureMessage(operation, result));
  }
};

export async function terraformInit({
  args = [],
  frozenLockfile = false,
  modulePath,
}: TerraformInitPayload): Promise<void> {
  if (disablesModuleDownloads(args)) {
    throw new Error(incompatibleGetArgumentError);
  }

  const previousProviderLock = frozenLockfile
    ? await readProviderLock(modulePath)
    : undefined;
  let providerLockVerified = !frozenLockfile;
  try {
    // The lock must describe the module cache produced by this initialization.
    await runTerraformCommand(
      "init",
      ["init", ...normalizeTerraformInitArguments(args), "-get=true"],
      modulePath,
    );
    await runTerraformCommand(
      "providers lock",
      ["providers", "lock", ...providerLockPlatforms],
      modulePath,
    );
    if (frozenLockfile) {
      const currentProviderLock = await readProviderLock(modulePath);
      if (currentProviderLock !== previousProviderLock) {
        throw new Error(
          `Terraform provider lock is frozen and out of date at ${path.join(modulePath, providerLockFileName)}`,
        );
      }
      providerLockVerified = true;
    }
  } finally {
    if (!providerLockVerified) {
      await restoreProviderLock(modulePath, previousProviderLock);
    }
  }

  const comparison = await compareModuleLock(modulePath);
  // Frozen mode is read-only: CI must fail on drift instead of changing the checkout.
  if (frozenLockfile && comparison.isDifferent) {
    const summary = getLockChangeSummary(
      comparison.changes,
      comparison.formatVersion,
    );
    throw new Error(
      `Terraform module lock is frozen and out of date at ${comparison.path}: ${summary}`,
    );
  }
  if (frozenLockfile) {
    return;
  }

  // Developer runs refresh the lock only after Terraform has initialized successfully.
  if (comparison.isDifferent) {
    await replaceFileAtomically(
      comparison.path,
      comparison.content,
      ".tfmodules-lock-",
    );
    console.log(`Updated Terraform module lock at ${comparison.path}`);
  }
}
