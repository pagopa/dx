---
sidebar_position: 4
---

# Required Resource Tags

All Azure resources created with Terraform must include a standard set of tags.
These tags are essential for cost tracking, ownership identification, and
resource management.

## Required Tags

| Tag              | Description                                  | Example Values                                                                       |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `CostCenter`     | Budget tracking identifier                   | `"TS000 - Tecnologia e Servizi"` for IO                                              |
| `CreatedBy`      | How the resource was created                 | Always `"Terraform"`                                                                 |
| `Environment`    | Deployment environment                       | `"Prod"`, `"Dev"`, `"Uat"`                                                           |
| `BusinessUnit`   | Product or business unit                     | `"App IO"`, `"CGN"`, `"Carta della Cultura"`, `"IT Wallet"`, `"DevEx"`               |
| `Source`         | Link to the Terraform source code            | `"https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"`                 |
| `ManagementTeam` | Team responsible for the resource management | `"IO Platform"`, `"IO Wallet"`, `"IO Comunicazione"`, `"Developer Experience"`, etc. |

## Implementation

Define tags in `locals.tf` and apply them to all resources:

```hcl title="locals.tf"
locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    Source         = "https://github.com/pagopa/io-infra/blob/main/infra/resources/prod"
    ManagementTeam = "IO Platform"
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

## Business Units

Common business unit values used at PagoPA:

| BusinessUnit          | Description               |
| --------------------- | ------------------------- |
| `App IO`              | IO mobile application     |
| `CGN`                 | Carta Giovani Nazionale   |
| `Carta della Cultura` | Cultural card initiative  |
| `IT Wallet`           | Digital wallet initiative |
| `DevEx`               | Developer Experience team |

## Management Teams

Common management team values for the IO product:

| ManagementTeam         | Area                    |
| ---------------------- | ----------------------- |
| `IO Platform`          | Platform infrastructure |
| `IO Wallet`            | Wallet features         |
| `IO Comunicazione`     | Communication features  |
| `IO Enti & Servizi`    | Services integration    |
| `IO Autenticazione`    | Authentication          |
| `IO Bonus & Pagamenti` | Bonus and payments      |
| `IO Firma`             | Digital signature       |
| `Developer Experience` | DevEx team              |

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
