---
sidebar_position: 4
---

# Required Resource Tags

Cloud resources must include the tags agreed for their owning team. These tags
are essential for cost tracking, ownership identification, and resource
management.

## DevEx Accounts and Subscriptions

Resources in DevEx Azure subscriptions and AWS accounts follow the
[DevEx cloud resource tagging agreement](https://pagopa.atlassian.net/wiki/search?text=Tag%20risorse%20cloud%20DevEx).
Tag names and values are **case-sensitive**:

| Tag           | Required value                                                |
| ------------- | ------------------------------------------------------------- |
| `CostCenter`  | `TS000 - TECNOLOGIA & SERVIZI`                                |
| `Owner`       | `DevEx`                                                       |
| `Environment` | `Dev`, `Uat`, or `Prod`, matching the deployment environment  |
| `Source`      | URL of the Terraform configuration root on the default branch |

```hcl title="infra/resources/prod/locals.tf"
locals {
  tags = {
    CostCenter  = "TS000 - TECNOLOGIA & SERVIZI"
    Owner       = "DevEx"
    Environment = "Prod"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/prod"
  }
}
```

Pass the root's `local.tags` to resources and modules. Internal child modules
forward `var.tags` unchanged: `Source` identifies the calling configuration
root, not the child module. Configure `default_tags { tags = local.tags }` on
every AWS provider, including aliases; AWS Cloud Control resources still need
explicit tags. Only add tags to resource types that support them.

The development Azure policy does not require these tags to be present. If one
of the four keys is assigned, the policy validates its name and allowed value.

Additional resource/module metadata tags may coexist with the four required
tags.

This agreement does **not** change the tagging interfaces or examples of
Registry-published Terraform modules, generic CLI scaffolds, or other teams'
infrastructure. Those consumers retain their own tagging conventions.

## Existing Conventions Outside DevEx

The following examples document conventions used by some non-DevEx
infrastructure. They are not the DevEx contract above and are not enforced by
the DevEx development policy.

### Required Tags

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
