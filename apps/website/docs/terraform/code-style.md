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
| `variables.tf`               | Input variables (**local modules only**, not in root modules)  |
| `outputs.tf`                 | Output values with descriptions                                |
| `main.tf` or `<resource>.tf` | Resources and modules (e.g., `azure.tf`, `function.tf`)        |
| `data.tf`                    | Data sources                                                   |
| `_modules/`                  | Local modules directory                                        |

:::info About project structure

This guide covers code style conventions for individual terraform
configurations. For the overall infrastructure project structure, see
[Infrastructure Folder Structure](./infra-folder-structure.md).

:::

## Local Modules

Use one local module per service or capability. Each module should:

- Have a single, well-defined responsibility (e.g., API gateway, data processor,
  message notifier)
- Own all the infrastructure resources that service needs (compute, storage, IAM
  permissions)
- Be deployable and testable in isolation

**Examples:**

- **API Management (APIM)**: APIM instance, policies, API definitions, private
  endpoint
- **Data Processor**: Function App + Storage Account + Blob Storage + IAM
  permissions
- **Message Notifier**: Function App + Service Bus connection + IAM for Service
  Bus
- **Reporting Service**: App Service + Application Insights + Database
  connection + IAM
- **Cache Layer**: Redis instance + private endpoint + firewall rules + IAM

### What NOT to Do (Anti-pattern)

❌ **Flat structure** - All resources in `main.tf` of root module:

```
infra/resources/prod/
├── locals.tf
├── main.tf              # Contains EVERYTHING (APIM, 5 functions, storage, etc.)
├── variables.tf         # Should not exist here!
├── outputs.tf
└── iam.tf               # Mixed permissions from all resources
```

This causes:

- Hard to understand what resources belong together
- Difficult to modify one component without affecting others
- Challenging to test or reuse configurations
- Risk of IAM permission management becoming chaotic
- Team members must coordinate on the entire main.tf

❌ **Over-nesting resources** - Multiple resources stuffed in one module:

```
infra/resources/_modules/
└── backend/
    ├── main.tf         # Has: Function 1, Function 2, Function 3, Storage 1, Storage 2, + all IAM
    ├── variables.tf
    └── iam.tf
```

This still causes the same problems, just at a smaller scale.

### What TO DO (Best Practice)

✅ **One module per service** - Each module owns the resources for one service:

```
infra/resources/_modules/
├── apim/               # API Management: instance + policies + private endpoint
│   ├── main.tf
│   ├── variables.tf
│   ├── iam.tf
│   └── outputs.tf
├── func_processor/     # Data Processor: function + storage + blob container + IAM
│   ├── main.tf
│   ├── variables.tf
│   ├── iam.tf
│   └── outputs.tf
├── func_notifier/      # Message Notifier: function + Service Bus connection + IAM
│   ├── main.tf
│   ├── variables.tf
│   ├── iam.tf
│   └── outputs.tf
└── reporting/          # Reporting Service: App Service + App Insights + DB connection + IAM
    ├── main.tf
    ├── variables.tf
    ├── iam.tf
    └── outputs.tf
```

Benefits:

- ✅ Clear ownership: "func_processor module manages everything about data
  processing"
- ✅ Easy to modify: "Change notifier Function? Edit only func_notifier module"
- ✅ Team can work in parallel: Different teams manage different modules
- ✅ IAM is localized: "func_processor/iam.tf has only permissions for processor
  function"
- ✅ Reusable: Can deploy the same function in another environment just by
  calling the module

### Why Use Local Modules?

Local modules provide several benefits:

- **Separation of concerns**: Each service (e.g., API Management, data
  processor, message notifier) lives in its own module with clear boundaries
- **Encapsulation**: Related resources and their IAM permissions stay together
- **Reusability**: Modules can be reused across environments with different
  configurations
- **Testability**: Smaller modules are easier to test and validate
- **Team collaboration**: Different team members can work on different modules
  without conflicts

### Module Organization Example

```
infra/resources/
├── _modules/
│   ├── apim/              # API Management service
│   │   ├── main.tf
│   │   ├── variables.tf   # Module inputs
│   │   └── outputs.tf
│   ├── func_processor/    # Data Processor service (Function App + Storage)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── iam.tf         # IAM permissions for this module
│   │   └── outputs.tf
│   └── func_notifier/     # Message Notifier service (Function App + IAM)
│       ├── main.tf
│       ├── variables.tf
│       ├── iam.tf
│       └── outputs.tf
└── prod/
    ├── locals.tf              # Environment configuration (no variables!)
    ├── providers.tf           # Provider and backend configuration
    ├── data.tf                # Shared data sources
    ├── main.tf                # Module instantiations
    └── outputs.tf             # Root module outputs
```

### IAM and Role Assignments

Each local module is responsible for the IAM permissions of the resources it
owns. Define role assignments in a dedicated `iam.tf` file inside the module,
keeping permissions co-located with the resources they protect. This avoids
scattered `azurerm_role_assignment` resources spread across the root module and
makes it easy to reason about the security boundary of each service.

For supported resource types (Storage Account, Cosmos DB, Key Vault, Event Hub,
and more), use the
[`azure-role-assignments`](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments/azurerm/latest)
DX module instead of raw `azurerm_role_assignment` resources. The module
encapsulates the correct role definitions, reduces boilerplate, and enforces
consistent patterns across all teams. Use bare `azurerm_role_assignment` only
for resource types not yet covered by the module.

For naming conventions, policies, and best practices around identity and access
management on Azure, see the [IAM documentation](../azure/iam/index.md).

### Root Module: Use Locals and Data Sources Only

:::warning No variables in root modules

Root modules (e.g., `infra/resources/prod/`) should **not** use `variables.tf`.
Instead, define all configuration in `locals.tf` and fetch existing resources
using data sources. Variables are reserved for local modules only.

:::

This approach ensures that:

- Environment-specific values are explicitly defined, not passed externally
- Configuration is self-contained and auditable
- There's no risk of accidental variable overrides
- The root module serves as the "composition layer" that wires modules together

```hcl title="infra/resources/prod/locals.tf"
locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "messages"
    app_name        = "processor"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    Source         = "https://github.com/pagopa/io-infra"
    ManagementTeam = "IO Platform"
  }

  # Module-specific configuration
  processor_config = {
    use_case = "high_load"
    tier     = "premium"
  }

  notifier_config = {
    use_case = "default"
    tier     = "standard"
  }
}
```

```hcl title="infra/resources/prod/data.tf"
# Fetch existing shared resources
data "azurerm_resource_group" "main" {
  name = "io-p-rg-common"
}

data "azurerm_virtual_network" "main" {
  name                = "io-p-vnet-common"
  resource_group_name = data.azurerm_resource_group.main.name
}

data "azurerm_key_vault" "main" {
  name                = "io-p-kv-common"
  resource_group_name = data.azurerm_resource_group.main.name
}
```

```hcl title="infra/resources/prod/main.tf"
# Compose modules using locals and data sources
module "apim" {
  source = "../_modules/apim"

  environment         = local.environment
  tags                = local.tags
  resource_group_name = data.azurerm_resource_group.main.name
  virtual_network_id  = data.azurerm_virtual_network.main.id
}

module "func_processor" {
  source = "../_modules/func_processor"

  environment         = local.environment
  tags                = local.tags
  config              = local.processor_config
  resource_group_name = data.azurerm_resource_group.main.name
  virtual_network_id  = data.azurerm_virtual_network.main.id
  key_vault_id        = data.azurerm_key_vault.main.id
  apim_id             = module.apim.id
}

module "func_notifier" {
  source = "../_modules/func_notifier"

  environment         = local.environment
  tags                = local.tags
  config              = local.notifier_config
  resource_group_name = data.azurerm_resource_group.main.name
  key_vault_id        = data.azurerm_key_vault.main.id
}
```

### Local Module: Use Variables for Inputs

Local modules receive their configuration through variables, making them
reusable and testable:

```hcl title="infra/resources/_modules/func_processor/variables.tf"
variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  description = "Environment configuration for resource naming."
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources."
}

variable "config" {
  type = object({
    use_case = string
    tier     = string
  })
  description = "Function App configuration."
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created."
}

variable "virtual_network_id" {
  type        = string
  description = "ID of the virtual network for private endpoints."
}

variable "key_vault_id" {
  type        = string
  description = "ID of the Key Vault for secrets."
}

variable "apim_id" {
  type        = string
  description = "ID of the API Management instance."
}
```

```hcl title="infra/resources/_modules/func_processor/main.tf"
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }
}

# Function App with its dedicated Storage Account
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 5.0"

  environment         = var.environment
  tags                = var.tags
  resource_group_name = var.resource_group_name
  # ... other configuration
}

# Storage Account directly related to this function
module "storage" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment         = var.environment
  tags                = var.tags
  resource_group_name = var.resource_group_name
  # ... other configuration
}
```

```hcl title="infra/resources/_modules/func_processor/iam.tf"
# Use the DX module for supported resource types
module "function_to_storage" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id    = module.function_app.principal_id
  subscription_id = var.subscription_id

  storage_blob = [
    {
      storage_account_name = module.storage.name
      resource_group_name  = var.resource_group_name
      role                 = "writer"
      description          = "Allow function app to write blobs"
    }
  ]
}

module "function_to_keyvault" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id    = module.function_app.principal_id
  subscription_id = var.subscription_id

  key_vault = [
    {
      name                = var.key_vault_name
      resource_group_name = var.resource_group_name
      description         = "Allow function app to read secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
```

## Variable Definitions

:::warning Variables are for local modules only

As described in the [Local Modules](#local-modules) section, **do not use
variables in root modules**. Use `locals.tf` and data sources instead. Variables
should only be defined in local modules to receive configuration from the root
module.

:::

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
