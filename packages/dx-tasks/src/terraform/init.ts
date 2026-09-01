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

const getInitFailureMessage = (result: ProcessResult): string => {
  const termination =
    result.signal === null
      ? `exit code ${result.exitCode}`
      : `signal ${result.signal}`;
  const details = [result.stderr.trim(), result.stdout.trim()]
    .filter((output) => output.length > 0)
    .join("\n");
  return `terraform init failed with ${termination}${details ? `\n${details}` : ""}`;
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

export async function terraformInit({
  args = [],
  frozenLockfile = false,
  modulePath,
}: TerraformInitPayload): Promise<void> {
  if (disablesModuleDownloads(args)) {
    throw new Error(incompatibleGetArgumentError);
  }

  // The lock must describe the module cache produced by this initialization.
  const result = await runCommand(
    "terraform",
    ["init", ...args, "-get=true"],
    modulePath,
    {},
  );
  printTerraformOutput(result);
  if (result.exitCode !== 0) {
    throw new Error(getInitFailureMessage(result));
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
