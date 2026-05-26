/** This module runs Terraform plans for dx-tasks without external process helpers. */

import * as z from "zod/mini";

import { maskOutput } from "./mask-output.ts";
import { runCommand } from "./run-command.ts";

const terraformPlanPayloadShape = {
  modulePath: z.string().check(z.minLength(1)),
  out: z.optional(z.string().check(z.minLength(1))),
  refresh: z._default(z.boolean(), true),
  verbose: z._default(z.boolean(), false),
};

export const payloadSchema = z.object(terraformPlanPayloadShape);

export interface TerraformPlanPayload {
  modulePath: string;
  out?: string;
  refresh?: boolean;
  verbose?: boolean;
}

const isRunningInCI = (): boolean => {
  const ci = process.env.CI;

  return Boolean(ci) && ci !== "false" && ci !== "0";
};

export async function terraformPlan({
  modulePath,
  out,
  refresh = true,
  verbose = false,
}: TerraformPlanPayload) {
  const args = new Map<string, string | true>();
  const env: Record<string, string> = {};

  args.set("lock-timeout", "120s");

  if (out) {
    args.set("out", out);
  }

  if (!refresh) {
    args.set("refresh", "false");
    args.set("lock", "false");
  }

  if (!verbose) {
    env.TF_IN_AUTOMATION = "true";
  }

  if (isRunningInCI()) {
    args.set("input", "false");
    args.set("no-color", true);
    env.TF_IN_AUTOMATION = "true";
  }

  env.TF_CLI_ARGS_plan = args
    .entries()
    .reduce(
      (acc, [key, value]) =>
        `${acc}-${key}${value === true ? "" : `=${value}`} `,
      "",
    );

  const result = await runCommand("terraform", ["plan"], modulePath, env);

  if (result.signal) {
    throw new Error(`terraform plan terminated by signal ${result.signal}`);
  }

  const maskedOutput = maskOutput(result.stdout);

  if (verbose) {
    console.log(maskedOutput);
    return;
  }

  const match = maskedOutput.match(
    /(?:^.*Terraform will perform the following actions:[\s\S]*|^.*No changes\..*)/m,
  );

  console.log((match && match[0]) ?? "No plan output available.");
}
