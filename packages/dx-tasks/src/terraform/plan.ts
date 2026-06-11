/** This module runs Terraform plans for dx-tasks without external process helpers. */

import util from "node:util";
import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";

import { Reporter, type ReporterNamespace } from "../reporter.ts";
import { runCommand } from "../run-command.ts";
import { maskOutput } from "./mask-output.ts";

const terraformPlanPayloadShape = {
  modulePath: z.string().check(z.minLength(1)),
  out: z.optional(z.string().check(z.minLength(1))),
  refresh: z._default(z.boolean(), true),
  report: z._default(z.boolean(), false),
  verbose: z._default(z.boolean(), false),
};

export const payloadSchema = z.object(terraformPlanPayloadShape);

export interface TerraformPlanPayload {
  modulePath: string;
  out?: string;
  refresh?: boolean;
  report?: boolean;
  verbose?: boolean;
}

const terraformPlanReportShape = {
  modulePath: z.string().check(z.minLength(1)),
  planOutput: z.string(),
};

export const terraformPlanReportSchema = z.object(terraformPlanReportShape);

export interface TerraformPlanReport {
  modulePath: string;
  planOutput: string;
}

const terraformPlanReporters = new WeakMap<
  Reporter,
  ReporterNamespace<typeof terraformPlanReportSchema>
>();

const getTerraformPlanReporter = (
  reporter: Reporter,
): ReporterNamespace<typeof terraformPlanReportSchema> => {
  const registeredReporter = terraformPlanReporters.get(reporter);

  if (registeredReporter) {
    return registeredReporter;
  }

  const namespaceReporter = reporter.registerNamespace(
    "terraform-plan",
    terraformPlanReportSchema,
  );
  terraformPlanReporters.set(reporter, namespaceReporter);

  return namespaceReporter;
};

const isRunningInCI = (): boolean => {
  const ci = process.env.CI;

  return Boolean(ci) && ci !== "false" && ci !== "0";
};

const getPlanOutput = (maskedOutput: string, verbose: boolean): string => {
  if (verbose) {
    return maskedOutput;
  }

  const match = maskedOutput.match(
    /(?:^.*Terraform will perform the following actions:[\s\S]*|^.*No changes\..*)/m,
  );

  return (match && match[0]) ?? "No plan output available.";
};

export async function terraformPlan(
  {
    modulePath,
    out,
    refresh = true,
    report = false,
    verbose = false,
  }: TerraformPlanPayload,
  context: TaskRunContext = {},
) {
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
  const planOutput = getPlanOutput(maskedOutput, verbose);

  if (report && context.reporter) {
    await getTerraformPlanReporter(context.reporter).write(
      Buffer.from(modulePath).toString("base64url"),
      {
        modulePath,
        planOutput: util.stripVTControlCharacters(planOutput),
      },
    );
  }

  console.log(planOutput);
}
