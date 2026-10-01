---
sidebar_position: 1
sidebar_label: Azure TAGs Policy Rule
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.

## DevEx Policy

The DX development subscription uses
[specific_tags_rule_v2.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v2.json)
It validates the
[DevEx tagging contract](../../../terraform/required-tags.md#devex-accounts-and-subscriptions)
when any of its keys are assigned:

| Tag           | Allowed value(s)                                                                     |
| ------------- | ------------------------------------------------------------------------------------ |
| `CostCenter`  | `TS000 - TECNOLOGIA & SERVIZI`                                                       |
| `Owner`       | `DevEx`                                                                              |
| `Environment` | `Dev`, `Uat`, or `Prod`                                                              |
| `Source`      | A non-empty Terraform root URL under `https://github.com/pagopa/dx/blob/main/infra/` |

Tags are optional: a resource can be created without these tags, or with only
some of them. If a selected tag is present, its name must use the exact casing
above and its value must match the allowed value(s).
