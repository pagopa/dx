---
sidebar_position: 1
sidebar_label: Azure TAGs Policy Rule
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.

## Policy Rules

This policy enforces the following conditions, only on the tags that are set
(unless `requireTags` is `true`, in which case all the enabled ones are
mandatory). A tag is enabled when its `allowed*` parameter is not empty:

- The `CostCenter` tag must be one of the allowed user-defined values.
- The `Owner` tag must be one of the allowed user-defined values.
- The `Environment` tag must be one of the allowed user-defined values.
- The `Source` tag must match the user-defined pattern.
- The `BusinessUnit` tag must be one of the allowed user-defined values.
- The `ManagementTeam` tag must be one of the allowed user-defined values.

If any of these conditions are not met, resource creation is denied. The full
policy definition can be found in
[specific_tags_rule_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v2.json).

## Parameters

The policy allows customization through the following parameters, defined in
[specific_tags_parameters_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_parameters_v2.json):

| Parameter                | Type    | Description                                       |
| ------------------------ | ------- | ------------------------------------------------- |
| `allowedCostCenters`     | Array   | Allowed CostCenter values.                        |
| `allowedOwners`          | Array   | Allowed Owner values.                             |
| `allowedEnvironments`    | Array   | Allowed Environment values.                       |
| `allowedSourcePattern`   | String  | Pattern (supports `*`) the Source tag must match. |
| `allowedBusinessUnits`   | Array   | Allowed BusinessUnit values.                      |
| `allowedManagementTeams` | Array   | Allowed ManagementTeam values.                    |
| `requireTags`            | Boolean | Makes enabled tags mandatory. Default `false`.    |
