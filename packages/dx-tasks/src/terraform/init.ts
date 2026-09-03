/** This module initializes Terraform and enforces Registry module locks. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

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

const getLockChangeSummary = (
  changes: readonly { key: string; status: string }[],
  formatVersion: 1 | 2,
): string =>
  formatVersion === 1
    ? "legacy module lock format (version 1)"
    : changes.length > 0
      ? changes.map(({ key, status }) => `${status}: ${key}`).join(", ")
      : "no module hash changes";

const runTerraformCommand = async (
  operation: string,
  args: string[],
  modulePath: string,
): Promise<void> => {
  const result = await runCommand("terraform", args, modulePath, {});
  if (result.stdout.length > 0) {
    console.log(result.stdout);
  }
  if (result.stderr.length > 0) {
    console.error(result.stderr);
  }
  if (result.exitCode !== 0) {
    const termination =
      result.signal === null
        ? `exit code ${result.exitCode}`
        : `signal ${result.signal}`;
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter((output) => output.length > 0)
      .join("\n");
    throw new Error(
      `terraform ${operation} failed with ${termination}${details ? `\n${details}` : ""}`,
    );
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

  const initArguments = [
    "init",
    ...normalizeTerraformInitArguments(args),
    "-get=true",
    ...(frozenLockfile ? ["-lockfile=readonly"] : []),
  ];

  // The lock must describe the module cache produced by this initialization.
  await runTerraformCommand("init", initArguments, modulePath);
  if (!frozenLockfile) {
    await runTerraformCommand(
      "providers lock",
      ["providers", "lock", ...providerLockPlatforms],
      modulePath,
    );
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
