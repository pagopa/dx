/**
 * @fileoverview Prompt assembly for the Terraform permission-check action.
 *
 * The action keeps the DX skill as the source of truth and wraps each CI run
 * with the concrete Terraform plan and resolved repository context.
 */

export interface PromptContext {
  azureMcpContext: string;
  cdIdentityName?: string;
  planText: string;
  skillText: string;
  workingDirectory: string;
}

export interface ResponsesRequest {
  input: string;
  instructions: string;
  model: string;
}

export function buildPrompt(context: PromptContext): string {
  return [
    "You are running inside a GitHub Actions CI job for a Terraform pull request.",
    "Use the attached DX skill exactly as the operating procedure.",
    "Return only the markdown report described by the skill output format.",
    "Do not suggest running mutations or changing Azure resources from this check.",
    "",
    `Terraform working directory: ${context.workingDirectory}`,
    `Infra CD identity: ${context.cdIdentityName ?? "not pre-resolved; infer it from the repository conventions if possible"}`,
    "Check path requested by the action: live Azure MCP read-only facts when available, otherwise Terraform-derived fallback.",
    "",
    "Azure MCP read-only context:",
    "```text",
    context.azureMcpContext.trim(),
    "```",
    "",
    "Sanitized Terraform plan:",
    "```hcl",
    context.planText.trim(),
    "```",
  ].join("\n");
}

export function buildResponsesRequest(
  context: PromptContext,
  modelDeploymentName: string,
): ResponsesRequest {
  return {
    input: buildPrompt(context),
    instructions: context.skillText,
    model: modelDeploymentName,
  };
}
