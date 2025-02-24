---
sidebar_position: 1
sidebar_label: Specific TAGs
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set of tagging rules.

## Policy Rules

This policy enforces the following conditions:

- The `CostCenter` tag must match the allowed user-defined value.
- The `CreatedBy` tag must be one of: `Terraform`, `ARM`, or `AzurePortal`.
- The `Environment` tag must be one between: `Prod`, `Dev`, or `Uat`.
- The `BusinessUnit` tag must be in the user-defined list of allowed values.
- If `CreatedBy` is `Terraform`, the `Source` tag must match a specific URL with a given GitHub organization.
- The `ManagementTeam` tag must be in the user-defined list of allowed values.

If any of these conditions are not met, resource creation is denied.
The full policy definition can be found in [specific_tags_rule_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v1.json).

## Parameters

The policy allows customization through the following parameters, defined in [specific_tags_parameters_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_parameters_v1.json):

| Parameter       | Type   | Description                                           |
|---------------|------|---------------------------------------------------|
| `CostCenter`   | String | Allowed CostCenter value.                         |
| `BusinessUnit` | Array  | Allowed Business Units.                           |
| `ManagementTeam` | Array  | Allowed Management Teams.                         |
| `SourceOrg`    | String | Allowed GitHub organization for source tagging. |
