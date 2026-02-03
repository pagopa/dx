---
sidebar_position: 3
---

# Terraform Code Style

This guide describes the DX code style conventions for Terraform configurations.
Following these conventions ensures consistency and maintainability across all
infrastructure code.

:::tip Before you start

Ensure [pre-commit hooks](./pre-commit-terraform.md) are set up to automate
validation and formatting of Terraform sources.

:::

## File Organization

Organize Terraform code into dedicated files based on their purpose:

| File                         | Content                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `locals.tf`                  | Local values, naming configs, computed values                  |
| `providers.tf`               | Terraform block, required providers, backend, provider configs |
| `variables.tf`               | Input variables with descriptions and validations              |
| `outputs.tf`                 | Output values with descriptions                                |
| `main.tf` or `<resource>.tf` | Resources and modules (e.g., `azure.tf`, `function.tf`)        |
| `data.tf`                    | Data sources                                                   |

:::info About project structure

This guide covers code style conventions for individual terraform
configurations. For the overall infrastructure project structure, see
[Infrastructure Folder Structure](./infra-folder-structure.md).

:::

## Variable Definitions

:::info Always include descriptions and validations

Every variable should have a `description` and, where applicable, a `validation`
block to catch errors early.

:::

```hcl title="variables.tf"
variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)  # Use optional() for non-required fields
    app_name        = string
    instance_number = string
  })
  description = "Values used to generate resource names and location short names."
}

variable "use_case" {
  type        = string
  description = "Function App use case. Allowed values: 'default', 'high_load'."
  default     = "default"

  validation {
    condition     = contains(["default", "high_load"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"high_load\"."
  }
}
```

## Output Definitions

Group related outputs in objects for better organization and discoverability.
Avoid nesting the resource name in the output structure to prevent redundant
keys when consuming the module (e.g., avoid
`module.x.function_app.function_app.id`):

```hcl title="outputs.tf"
output "postgres" {
  description = "Details of the PostgreSQL Flexible Server, including its name, ID, and resource group name."
  value = {
    name                = azurerm_postgresql_flexible_server.this.name
    id                  = azurerm_postgresql_flexible_server.this.id
    resource_group_name = azurerm_postgresql_flexible_server.this.resource_group_name
  }
}

output "postgres_replica" {
  description = "Details of the PostgreSQL Flexible Server Replica, including its name and ID."
  value = local.replica.create == true ? {
    name = azurerm_postgresql_flexible_server.replica[0].name
    id   = azurerm_postgresql_flexible_server.replica[0].id
  } : {}
}
```

## Locals Best Practices

### Use a `naming_config` Local

Create a `naming_config` local to standardize resource naming with the
[DX provider](../azure/using-azure-registry-provider.md):

```hcl title="locals.tf"
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  # Use naming_config with provider function
  function_app_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "function_app" }
  ))
}
```

### Automatic Subnet CIDR Generation

Use the DX provider `dx_available_subnet_cidr` resource for every new subnet to
automatically allocate a non-overlapping CIDR block inside the target Virtual
Network.

See the full usage and examples in the DX provider docs:
[dx_available_subnet_cidr resource](https://dx.pagopa.it/docs/azure/using-azure-registry-provider#dx_available_subnet_cidr-resource)

### Define Use Cases with Maps

Many DX Registry modules already have built-in `use_case` configurations for
common scenarios. For custom resources or when modules don't provide the needed
use cases, define your own using maps:

```hcl title="locals.tf"
locals {
  use_cases = {
    default = {
      sku            = "P1v3"
      zone_balancing = true
    }
    high_load = {
      sku            = "P2mv3"
      zone_balancing = true
    }
  }

  # Select features based on variable
  use_case_features = local.use_cases[var.use_case]
}
```

## count vs for_each

:::warning Prefer for_each over count

Using `count` with lists can cause unexpected resource recreation when items are
added or removed.

:::

```hcl title="✅ Good: for_each with maps/sets"
resource "azurerm_resource_group" "this" {
  for_each = var.environments  # map or set

  name     = "rg-${each.key}"
  location = each.value.location
}
```

```hcl title="⚠️ OK: count for enable/disable patterns"
resource "azurerm_subnet" "optional" {
  count = var.create_subnet ? 1 : 0

  name = "my-subnet"
  # ...
}
```

```hcl title="❌ Avoid: count with lists"
# Index changes cause recreation!
resource "azurerm_subnet" "bad" {
  count = length(var.subnet_names)
  name  = var.subnet_names[count.index]  # Risky!
}
```

### Why Prefer for_each?

| Aspect          | `for_each`                         | `count`                     |
| --------------- | ---------------------------------- | --------------------------- |
| Identifiers     | Stable keys (`resource["prod"]`)   | Index-based (`resource[0]`) |
| Reordering      | No recreation                      | May cause recreation        |
| Adding/removing | Only affects target resource       | May shift all indexes       |
| Readability     | `this["prod"]` is self-documenting | `this[0]` requires context  |

## Formatting Rules

- ✅ Use `try()` for optional attribute access:
  `try(resource.attr[0].value, null)`

---

## Standard File Templates

### Standard locals.tf

```hcl title="infra/resources/prod/locals.tf"
locals {
  environment = {
    prefix          = "<product>"      # e.g., "io", "cgn"
    env_short       = "p"              # p, d, u
    location        = "italynorth"
    domain          = "<domain>"       # optional
    app_name        = "<app>"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"            # Based on folder: Prod, Dev, Uat
    BusinessUnit   = "<business-unit>"
    Source         = "https://github.com/pagopa/<repo>/blob/main/infra/resources/prod"
    ManagementTeam = "<team>"
  }
}
```

:::note

See [Required Tags](./required-tags.md) for details on mandatory tag values.

:::

### Standard providers.tf

```hcl title="infra/resources/prod/providers.tf"
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      # always check for latest available release
      version = "~> 0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "<tfstate-rg>"
    storage_account_name = "<tfstate-storage>"
    container_name       = "terraform-state"
    key                  = "<project>.<layer>.<env>.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "dx" {}
```

:::tip State key naming convention

Use the format `<project>.<layer>.<env>.tfstate` for the backend key:

- `io.resources.prod.tfstate`
- `cgn.bootstrapper.dev.tfstate`

:::
