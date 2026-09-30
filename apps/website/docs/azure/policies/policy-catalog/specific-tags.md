---
sidebar_position: 1
sidebar_label: Azure TAGs Policy Rule
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.

## DevEx Policy (v2)

The DX development subscription uses
[specific_tags_rule_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v2.json)
with the parameters in
[specific_tags_parameters_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_parameters_v2.json).
It enforces the
[DevEx tagging contract](../../../terraform/required-tags.md#devex-accounts-and-subscriptions):

| Parameter      | Type   | DX development assignment                         |
| -------------- | ------ | ------------------------------------------------- |
| `CostCenter`   | String | `TS000 - TECNOLOGIA & SERVIZI`                    |
| `Owner`        | String | `DevEx`                                           |
| `Environment`  | String | `Dev` (allowed assignments: `Dev`, `Uat`, `Prod`) |
| `SourcePrefix` | String | `https://github.com/pagopa/dx/blob/main/infra/`   |

The rule denies missing or incorrectly cased tag names and mismatched values. It
uses case-sensitive `notMatch` conditions for `CostCenter`, `Owner`, and
`Environment`. Since Azure normally looks up tag names case-insensitively, the
rule also checks their exact spelling in the serialized tags object. `Source`
must start with the case-sensitive `SourcePrefix` and contain a configuration
path after it; the Terraform root sets the exact URL. `CreatedBy`,
`BusinessUnit`, and `ManagementTeam` are not required.

The policy uses `Indexed` mode to target resources that support tags. It does
not retag existing resources automatically or govern AWS resources.

### Migration from v1

Apply `infra/policy/dev` **before** applying the updated development
bootstrapper/core/resources configurations. The old deny policy otherwise
rejects the new tag maps. Azure does not allow removing parameters from an
existing definition, so DX creates a v2-named definition, switches its
assignment, then removes the old definition.

The shared v1 JSON files remain unchanged for external consumers. No
Registry-published Terraform module changes are needed.

## Legacy Shared Policy (v1)

The following contract remains available to teams using the original policy.

### Policy Rules

This policy enforces the following conditions:

- The `CostCenter` tag must match the allowed user-defined value.
- The `CreatedBy` tag must be either one of: `Terraform` or `ARM`.
- The `Environment` tag must be one between: `Prod`, `Dev`, or `Uat`.
- The `BusinessUnit` tag must be in the user-defined list of allowed values.
- If `CreatedBy` is `Terraform`, the `Source` tag must match a specific URL to
  the Terraform workspace in the codebase
- The `ManagementTeam` tag must be in the user-defined list of allowed values.

If any of these conditions are not met, resource creation is denied. The full
policy definition can be found in
[specific_tags_rule_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v1.json).

### Parameters

The policy allows customization through the following parameters, defined in
[specific_tags_parameters_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_parameters_v1.json):

| Parameter        | Type   | Description                                     |
| ---------------- | ------ | ----------------------------------------------- |
| `CostCenter`     | String | Allowed CostCenter value.                       |
| `BusinessUnit`   | Array  | Allowed Business Units.                         |
| `ManagementTeam` | Array  | Allowed Management Teams.                       |
| `SourceOrg`      | String | Allowed GitHub organization for source tagging. |
