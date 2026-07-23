/** Renders deterministic DX ownership and remediation guidance as Markdown. */

import type { PermissionEvaluation } from "./permission-evaluator.js";
import type {
  InconclusiveChange,
  PermissionRequirement,
} from "./terraform-plan.js";

export interface ReportInput {
  evaluations: readonly PermissionEvaluation[];
  inconclusiveChanges: readonly InconclusiveChange[];
  subscriptionId: string;
  workingDirectory: string;
}

export interface ReportOutput {
  gapCount: number;
  inconclusiveCount: number;
  markdown: string;
  passCount: number;
}

interface Ownership {
  layer: string;
  remediation: string;
}

const subscriptionIdPattern = /^\/subscriptions\/([^/]+)/iu;
const resourceGroupScopePattern =
  /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/?$/iu;
const subscriptionScopePattern = /^\/subscriptions\/[^/]+\/?$/iu;

export const classifyOwnership = (
  requirement: PermissionRequirement,
  currentSubscriptionId: string,
): Ownership => {
  const targetSubscriptionId = subscriptionIdPattern.exec(
    requirement.scope,
  )?.[1];
  if (
    targetSubscriptionId &&
    targetSubscriptionId.toLowerCase() !== currentSubscriptionId.toLowerCase()
  ) {
    return {
      layer: "target subscription",
      remediation:
        "Configure the narrow assignment in the Terraform configuration that owns the target subscription.",
    };
  }

  if (
    /Microsoft\.Storage\/storageAccounts\/[^/]*tfstate/iu.test(
      requirement.scope,
    )
  ) {
    return {
      layer: "core",
      remediation:
        "Add the narrow state-storage permission in core before applying dependent layers.",
    };
  }

  if (
    /private[-_]?network|private[-_]?dns|privatelink|Microsoft\.Network\/privateDnsZones/iu.test(
      `${requirement.resourceAddress} ${requirement.scope}`,
    )
  ) {
    return {
      layer: "bootstrapper / DX networking",
      remediation:
        "Update the bootstrap-managed private-networking permission at the reported scope; escalate to DX when the consumer does not own it.",
    };
  }

  if (
    subscriptionScopePattern.test(requirement.scope) ||
    resourceGroupScopePattern.test(requirement.scope)
  ) {
    return {
      layer: "bootstrapper",
      remediation:
        "Add the narrow CD baseline permission at the reported subscription or resource-group scope in bootstrapper.",
    };
  }

  return {
    layer: "resources",
    remediation:
      "Add the narrow resource-local permission in the resources layer that owns the target resource.",
  };
};

const escapeTableCell = (value: string): string =>
  value.replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");

const escapeHeading = (value: string): string =>
  value.replace(/[\\()[\]]/gu, "\\$&").replace(/\r?\n/gu, " ");

const code = (value: string): string => `\`${value.replace(/`/gu, "\\`")}\``;

const remediationFor = (
  evaluation: PermissionEvaluation,
  ownership: Ownership,
): string => {
  if (evaluation.result === "pass") {
    return "No change required.";
  }
  if (evaluation.result === "inconclusive") {
    return `Resolve the reported RBAC ambiguity with ${ownership.layer} and rerun; do not treat this result as safe.`;
  }
  return ownership.remediation;
};

export const renderReport = (input: ReportInput): ReportOutput => {
  const passCount = input.evaluations.filter(
    (evaluation) => evaluation.result === "pass",
  ).length;
  const gapCount = input.evaluations.filter(
    (evaluation) => evaluation.result === "gap",
  ).length;
  const inconclusiveCount =
    input.inconclusiveChanges.length +
    input.evaluations.filter(
      (evaluation) => evaluation.result === "inconclusive",
    ).length;
  const overallResult =
    gapCount > 0 ? "GAP" : inconclusiveCount > 0 ? "INCONCLUSIVE" : "PASS";

  const evaluationRows = input.evaluations.map((evaluation) => {
    const ownership = classifyOwnership(
      evaluation.requirement,
      input.subscriptionId,
    );
    const evidence =
      evaluation.evidence.length > 0
        ? evaluation.evidence.join("; ")
        : "No applicable assignment grants the required action";
    return `| ${evaluation.result.toUpperCase()} | ${code(evaluation.requirement.resourceAddress)} | ${code(evaluation.requirement.action)} | ${code(evaluation.requirement.scope)} | ${escapeTableCell(ownership.layer)} | ${escapeTableCell(evidence)} | ${escapeTableCell(remediationFor(evaluation, ownership))} |`;
  });
  const unsupportedRows = input.inconclusiveChanges.map(
    (change) =>
      `| INCONCLUSIVE | ${code(change.resourceAddress)} | ${code(change.resourceType)} | ${escapeTableCell(change.reason)} |`,
  );

  const sections = [
    `## Terraform Permission Check (${escapeHeading(input.workingDirectory)})`,
    "",
    `**${overallResult}** - ${passCount} passed, ${gapCount} gaps, ${inconclusiveCount} inconclusive.`,
    "",
    "This deterministic, read-only advisory check evaluates supported Azure management-plane RBAC requirements for the Infra CD identity. It does not modify Azure, Terraform state, or source code.",
  ];

  if (evaluationRows.length > 0) {
    sections.push(
      "",
      "| Result | Terraform resource | Required action | Target scope | Owner | Evidence | Remediation |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      ...evaluationRows,
    );
  }

  if (unsupportedRows.length > 0) {
    sections.push(
      "",
      "### Coverage limits",
      "",
      "| Result | Terraform resource | Type | Reason |",
      "| --- | --- | --- | --- |",
      ...unsupportedRows,
    );
  }

  return {
    gapCount,
    inconclusiveCount,
    markdown: `${sections.join("\n")}\n`,
    passCount,
  };
};
