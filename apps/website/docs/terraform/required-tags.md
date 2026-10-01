---
sidebar_position: 4
---

# Required Resource Tags

All Azure resources created with Terraform must include a standard set of tags.
These tags are essential for cost tracking, ownership identification, and
resource management.

## Required Tags

| Tag           | Description                       | Example Values                                                       |
| ------------- | --------------------------------- | -------------------------------------------------------------------- |
| `CostCenter`  | Budget tracking identifier        | `"TS000 - TECNOLOGIA & SERVIZI"`                                     |
| `Owner`       | Team owning the resource          | `"DevEx"`                                                            |
| `Environment` | Deployment environment            | `"Prod"`, `"Dev"`, `"Uat"`                                           |
| `Source`      | Link to the Terraform source code | `"https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"` |

## Implementation

Define tags in `locals.tf` and apply them to all resources:

```hcl title="locals.tf"
locals {
  tags = {
    CostCenter  = "TS000 - TECNOLOGIA & SERVIZI"
    Owner       = "DevEx"
    Environment = "Prod"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/prod"
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

## Environment Values

The `Environment` tag should match the deployment folder:

| Folder  | Environment Tag |
| ------- | --------------- |
| `dev/`  | `"Dev"`         |
| `uat/`  | `"Uat"`         |
| `prod/` | `"Prod"`        |

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
