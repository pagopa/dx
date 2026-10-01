---
sidebar_position: 4
---

# Required Resource Tags

All cloud resources created with Terraform must be tagged according to the DX
conventions.

The complete list of available tags and their allowed values is
available in the
[tagging strategy documentation](https://pagopa.atlassian.net/wiki/search?xpis=eyJicmlkZ2UiOiJxdWlja0ZpbmQiLCJpZCI6IjE3OTA4NjY2OTUxNzMiLCJzb3VyY2UiOiJjb25mbHVlbmNlIn0%3D&text=tagging%20strategy).

## Mandatory Tags

| Tag           | Description                       |
| ------------- | --------------------------------- |
| `CostCenter`  | Budget tracking identifier        |
| `Environment` | Deployment environment            |
| `Owner`       | Team owning the resource          |
| `Source`      | Link to the Terraform source code |

## Optional Tags

DX also suggests the following optional tags:

| Tag              | Description                           |
| ---------------- | ------------------------------------- |
| `BusinessUnit`   | Business unit the resource belongs to |
| `ManagementTeam` | Team managing the resource            |

## Implementation

Define tags in `locals.tf` and apply them to all resources:

```hcl title="locals.tf"
locals {
  tags = {
    CostCenter  = "<cost-center>"
    Environment = "<environment>"
    Owner       = "<owner>"
    Source      = "https://github.com/pagopa/<repository>/blob/main/infra/resources/<environment>"
  }
}
```

```hcl title="main.tf"
resource "azurerm_resource_group" "example" {
  name     = "example-rg"
  location = "italynorth"

  tags = local.tags
}
```

:::tip Consistent Tagging

Always pass `local.tags` to resources and modules. Never hardcode tags directly
in resources.

:::

## Source Tag Format

The `Source` tag must point to the exact location of the Terraform code in the
GitHub repository:

```text
https://github.com/pagopa/<repository>/blob/main/infra/resources/<environment>
```

:::info Examples

- `https://github.com/pagopa/io-infra/blob/main/infra/resources/prod`
- `https://github.com/pagopa/cgn-onboarding-portal/blob/main/infra/resources/dev`

:::
