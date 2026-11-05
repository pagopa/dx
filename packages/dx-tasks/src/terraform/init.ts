/** This module initializes Terraform and enforces Registry module locks. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

import type { ProcessResult } from "../run-command.ts";

import { runCommand } from "../run-command.ts";
import { compareModuleLock } from "./module-lock.ts";

const incompatibleGetArgumentError =
  "The -get=false option is incompatible with Terraform module locking";

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
  platforms: z._default(z.array(z.string()), []),
};

export const payloadSchema = z.object(terraformInitPayloadShape);

export interface TerraformInitPayload {
  args?: string[];
  frozenLockfile?: boolean;
  modulePath: string;
  platforms?: string[];
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
  command: string,
  result: ProcessResult,
): string => {
  const termination =
    result.signal === null
      ? `exit code ${result.exitCode}`
      : `signal ${result.signal}`;
  const details = [result.stderr.trim(), result.stdout.trim()]
    .filter((output) => output.length > 0)
    .join("\n");
  return `${command} failed with ${termination}${details ? `\n${details}` : ""}`;
};

const providerLockFileName = ".terraform.lock.hcl";

const readProviderLock = async (
  modulePath: string,
): Promise<string | undefined> => {
  try {
    return await fs.readFile(
      path.join(modulePath, providerLockFileName),
      "utf8",
    );
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
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

const runTerraformCommand = (
  args: string[],
  modulePath: string,
): Promise<ProcessResult> => {
  console.log(`$ terraform ${args.join(" ")}`);
  return runCommand("terraform", args, modulePath, {});
};

export async function terraformInit({
  args = [],
  frozenLockfile = false,
  modulePath,
  platforms = [],
}: TerraformInitPayload): Promise<void> {
  if (disablesModuleDownloads(args)) {
    throw new Error(incompatibleGetArgumentError);
  }

  const providerLockPath = path.join(modulePath, providerLockFileName);
  const providerLockBeforeInit = await readProviderLock(modulePath);

  // The lock must describe the module cache produced by this initialization.
  const result = await runTerraformCommand(
    [
      "init",
      ...normalizeTerraformInitArguments(args),
      ...(frozenLockfile ? ["-lockfile=readonly"] : []),
      "-get=true",
    ],
    modulePath,
  );
  printTerraformOutput(result);
  if (result.exitCode !== 0) {
    throw new Error(getTerraformFailureMessage("terraform init", result));
  }
  if (platforms.length > 0) {
    const providerLockResult = await runTerraformCommand(
      [
        "providers",
        "lock",
        "-enable-plugin-cache",
        ...platforms.map((platform) => `-platform=${platform}`),
      ],
      modulePath,
    );
    printTerraformOutput(providerLockResult);
    if (providerLockResult.exitCode !== 0) {
      throw new Error(
        getTerraformFailureMessage(
          "terraform providers lock",
          providerLockResult,
        ),
      );
    }
  }

  if (frozenLockfile) {
    const providerLockAfterInit = await readProviderLock(modulePath);
    if (providerLockBeforeInit !== providerLockAfterInit) {
      throw new Error(
        `Terraform provider lock is frozen and out of date at ${providerLockPath}`,
      );
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
    // Replace the lock atomically so interruptions cannot leave a partial file or
    // follow a symlink outside the project.
    const temporaryDirectory = await fs.mkdtemp(
      path.join(path.dirname(comparison.path), ".tfmodules-lock-"),
    );
    const temporaryPath = path.join(temporaryDirectory, "tfmodules.lock.json");
    try {
      await fs.writeFile(temporaryPath, comparison.content, {
        encoding: "utf8",
        flag: "wx",
      });
      await fs.rename(temporaryPath, comparison.path);
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
    console.log(`Updated Terraform module lock at ${comparison.path}`);
  }
}
