/**
 * @fileoverview Terraform Permission Check action entry point.
 *
 * Reads the sanitized Terraform plan, loads the DX permission-check skill from
 * the action repository, invokes the private Foundry gateway, and writes the
 * markdown verdict for later PR commenting.
 */

import * as core from "@actions/core";
import fs from "node:fs/promises";
import path from "node:path";

import { collectAzureMcpContext } from "./azure-mcp.js";
import { callFoundryGateway } from "./foundry-client.js";
import { buildResponsesRequest } from "./prompt.js";
import { type Inputs, InputsSchema } from "./schema.js";

const DEFAULT_SKILL_RELATIVE_PATH = [
  "..",
  "..",
  "plugins",
  "azure",
  "skills",
  "terraform-permission-check",
  "SKILL.md",
];

export async function run(): Promise<void> {
  try {
    core.info("Starting Terraform permission check");
    const inputs = parseInputs();
    const workingDirectory = resolveFromWorkspace(inputs["working-directory"]);
    const planText = await fs.readFile(
      resolveFromWorkspace(inputs["filtered-plan-path"]),
      "utf8",
    );
    const skillText = await fs.readFile(resolveSkillPath(inputs), "utf8");
    const azureMcpContext = await collectAzureMcpContext({
      argsText: inputs["azure-mcp-args"],
      cdIdentityName: inputs["cd-identity-name"],
      command: inputs["azure-mcp-command"],
      enabled: inputs["azure-mcp-enabled"],
      environment: process.env,
      planText,
      subscriptionId: inputs["azure-subscription-id"],
      timeoutMs: inputs["azure-mcp-timeout-ms"],
      workingDirectory,
    });

    const request = buildResponsesRequest(
      {
        azureMcpContext,
        cdIdentityName: inputs["cd-identity-name"],
        planText,
        skillText,
        workingDirectory: inputs["working-directory"],
      },
      inputs["model-deployment-name"],
    );

    const markdownReport = addCommentMarker(
      await callFoundryGateway({
        body: request,
        tokenScope: inputs["gateway-token-scope"],
        url: inputs["gateway-url"],
      }),
      inputs["working-directory"],
    );

    const outputFile = resolveOutputFile(
      workingDirectory,
      inputs["output-file"],
    );
    await fs.writeFile(outputFile, `${markdownReport}\n`, "utf8");

    core.setOutput("markdown-report", markdownReport);
    core.setOutput("markdown-report-file", outputFile);
    core.info(`Terraform permission check report written to ${outputFile}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

function parseInputs(): Inputs {
  const result = InputsSchema.safeParse({
    "azure-mcp-args": core.getInput("azure-mcp-args"),
    "azure-mcp-command": core.getInput("azure-mcp-command"),
    "azure-mcp-enabled": core.getInput("azure-mcp-enabled"),
    "azure-mcp-timeout-ms": core.getInput("azure-mcp-timeout-ms"),
    "azure-subscription-id": core.getInput("azure-subscription-id"),
    "cd-identity-name": core.getInput("cd-identity-name"),
    "filtered-plan-path": core.getInput("filtered-plan-path"),
    "gateway-token-scope": core.getInput("gateway-token-scope"),
    "gateway-url": core.getInput("gateway-url"),
    "model-deployment-name": core.getInput("model-deployment-name"),
    "output-file": core.getInput("output-file"),
    "skill-path": core.getInput("skill-path"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!result.success) {
    throw new Error(
      result.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  return result.data;
}

function resolveFromWorkspace(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(
    process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
    filePath,
  );
}

function resolveOutputFile(
  workingDirectory: string,
  outputFile: string,
): string {
  if (path.isAbsolute(outputFile)) {
    return outputFile;
  }
  return path.resolve(workingDirectory, outputFile);
}

function resolveSkillPath(inputs: Inputs): string {
  if (inputs["skill-path"]) {
    return resolveFromWorkspace(inputs["skill-path"]);
  }

  const actionPath = process.env["GITHUB_ACTION_PATH"] ?? process.cwd();
  return path.resolve(actionPath, ...DEFAULT_SKILL_RELATIVE_PATH);
}

export function addCommentMarker(
  markdownReport: string,
  workingDirectory: string,
): string {
  return [
    `<!-- Terraform Permission Check (${workingDirectory}) -->`,
    markdownReport,
  ].join("\n\n");
}

if (require.main === module) {
  void run();
}
