---
sidebar_position: 1
sidebar_label: Specific TAGs
---

# Specific TAGs

This policy rule ensures that all Azure resources comply with a predefined set of tagging rules.

## Policy Rules

This policy enforces the following conditions:

- The `CostCenter` tag must match the allowed parameter value.
- The `CreatedBy` tag must be one of: `Terraform`, `ARM`, or `AzurePortal`.
- The `Environment` tag must be one between: `Prod`, `Dev`, or `Uat`.
- The `BusinessUnit` tag must match one of the allowed values.
- If `CreatedBy` is `Terraform`, the `Source` tag must match a specific URL with a given GitHub organization.
- The `ManagementTeam` tag must match one of the allowed values.

If any of these conditions are not met, resource creation is denied.

## Parameters

The policy allows customization through the following parameters:

| Parameter       | Type   | Description                                           |
|---------------|------|---------------------------------------------------|
| `CostCenter`   | String | Allowed CostCenter value.                         |
| `BusinessUnit` | Array  | Allowed Business Units.                           |
| `ManagementTeam` | Array  | Allowed Management Teams.                         |
| `SourceOrg`    | String | Allowed GitHub organization for source tagging. |

## Policy Rule JSON

```json
{
  "if": {
    "anyOf": [
      {
        "field": "tags.CostCenter",
        "notEquals": "[parameters('CostCenter')]"
      },
      {
        "field": "tags.CreatedBy",
        "notIn": [
          "Terraform",
          "ARM",
          "AzurePortal"
        ]
      },
      {
        "field": "tags.Environment",
        "notIn": [
          "Prod",
          "Dev",
          "Uat"
        ]
      },
      {
        "field": "tags.BusinessUnit",
        "notIn": "[parameters('BusinessUnit')]"
      },
      {
        "allOf": [
          {
            "field": "tags.CreatedBy",
            "equals": "Terraform"
          },
          {
            "field": "tags.Source",
            "notLike": "[concat('https://github.com/', parameters('SourceOrg'), '/*')]"
          }
        ]
      },
      {
        "field": "tags.ManagementTeam",
        "notIn": "[parameters('ManagementTeam')]"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

## Policy Rule Parameters JSON

```json
{
  "CostCenter": {
    "type": "String",
    "metadata": {
      "displayName": "Allowed CostCenter",
      "description": "Specify the allowed CostCenter value."
    }
  },
  "BusinessUnit": {
    "type": "Array",
    "metadata": {
      "displayName": "Allowed Business Units",
      "description": "Specify the allowed Business Units."
    }
  },
  "ManagementTeam": {
    "type": "Array",
    "metadata": {
      "displayName": "Allowed Management Teams",
      "description": "Specify the allowed Management Teams."
    }
  },
  "SourceOrg": {
    "type": "String",
    "metadata": {
      "displayName": "Allowed GitHub Organization",
      "description": "Specify the allowed GitHub organization for source tagging."
    }
  }
}
```
