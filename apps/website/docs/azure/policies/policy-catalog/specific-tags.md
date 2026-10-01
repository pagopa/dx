---
sidebar_position: 1
sidebar_label: Azure TAGs Policy Rule
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.

## Parameters

| Parameter              | Type    | Description                                                               |
| ---------------------- | ------- | ------------------------------------------------------------------------- |
| `allowedCostCenters`   | Array   | Allowed values for `CostCenter`                                           |
| `allowedOwners`        | Array   | Allowed values for `Owner`                                                |
| `allowedEnvironments`  | Array   | Allowed values for `Environment`                                          |
| `allowedSourcePattern` | String  | Pattern (supports `*`) the `Source` tag must match                        |
| `requireTags`          | Boolean | When `true`, all four tags are mandatory; default `false` (tags optional) |

Tag names and values are case-sensitive. If a tag is present, its name must use
the exact casing above and its value must be one of the allowed values.

## DevEx Policy

The DX development subscription assigns
[specific_tags_rule_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v2.json)
with the values of the
[DevEx tagging contract](../../../terraform/required-tags.md#devex-accounts-and-subscriptions)
and `requireTags = false`:

| Tag           | Allowed value(s)                                 |
| ------------- | ------------------------------------------------ |
| `CostCenter`  | `TS000 - TECNOLOGIA & SERVIZI`                   |
| `Owner`       | `DevEx`                                          |
| `Environment` | `Dev`, `Uat`, or `Prod`                          |
| `Source`      | `https://github.com/pagopa/dx/blob/main/infra/*` |

Other teams can reuse the same definition by assigning it with their own values.
