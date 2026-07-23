/** GitHub Action entrypoint for deterministic Terraform RBAC preflight checks. */

import * as core from "@actions/core";
import fs from "node:fs/promises";
import path from "node:path";

import { parseActionInputs } from "./action-inputs.js";
import { collectAzureRbacFacts } from "./azure-rbac.js";
import {
  evaluateRequirements,
  type PermissionEvaluation,
} from "./permission-evaluator.js";
import { renderReport } from "./report.js";
import { extractPlanRequirements } from "./terraform-plan.js";
import { showTerraformPlan } from "./terraform-show.js";

const resolveFromWorkspace = (filePath: string): string =>
  path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.env["GITHUB_WORKSPACE"] ?? process.cwd(), filePath);

const run = async (): Promise<void> => {
  const inputs = parseActionInputs({
    azureSubscriptionId:
      core.getInput("azure-subscription-id") ||
      process.env["ARM_SUBSCRIPTION_ID"] ||
      "",
    cdIdentityName: core.getInput("cd-identity-name"),
    cdIdentityResourceGroupName: core.getInput(
      "cd-identity-resource-group-name",
    ),
    outputFile: core.getInput("output-file") || "terraform-permission-check.md",
    terraformPlanPath: core.getInput("terraform-plan-path"),
    workingDirectory: core.getInput("working-directory") || ".",
  });
  const workingDirectory = resolveFromWorkspace(inputs.workingDirectory);
  const terraformPlanPath = resolveFromWorkspace(inputs.terraformPlanPath);
  const plan = await showTerraformPlan(terraformPlanPath, workingDirectory);
  const planRequirements = extractPlanRequirements(plan, {
    subscriptionId: inputs.azureSubscriptionId,
  });

  let evaluations: readonly PermissionEvaluation[] = [];
  if (planRequirements.requirements.length > 0) {
    const collection = await collectAzureRbacFacts({
      cdIdentityName: inputs.cdIdentityName,
      cdIdentityResourceGroupName: inputs.cdIdentityResourceGroupName,
      subscriptionId: inputs.azureSubscriptionId,
      targetScopes: planRequirements.requirements.map(
        (requirement) => requirement.scope,
      ),
    });
    evaluations =
      collection.status === "collected"
        ? evaluateRequirements(planRequirements.requirements, collection.facts)
        : planRequirements.requirements.map((requirement) => ({
            evidence: [collection.reason],
            requirement,
            result: "inconclusive",
          }));
  }

  const report = renderReport({
    evaluations,
    inconclusiveChanges: planRequirements.inconclusive,
    subscriptionId: inputs.azureSubscriptionId,
    workingDirectory: inputs.workingDirectory,
  });
  const outputFile = path.isAbsolute(inputs.outputFile)
    ? inputs.outputFile
    : path.resolve(workingDirectory, inputs.outputFile);
  await fs.writeFile(outputFile, report.markdown, "utf8");

  core.setOutput("markdown-report", report.markdown);
  core.setOutput("markdown-report-file", outputFile);
  core.setOutput("pass-count", report.passCount);
  core.setOutput("gap-count", report.gapCount);
  core.setOutput("inconclusive-count", report.inconclusiveCount);
  core.info(`Terraform permission report written to ${outputFile}`);
};

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
