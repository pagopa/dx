---
name: terraform-dx-best-practices
description: Guides Terraform code authoring following PagoPA DX conventions. Use when writing or reviewing Terraform configurations (.tf files), deploying Azure/AWS infrastructure, or using DX Registry modules.
---

# Terraform DX Best Practices

## Agent Instructions

When generating Terraform code:

1. **Always check the Terraform Registry for the latest module versions** before writing module blocks. Use the available tools to search for modules and retrieve their details:
   - Search for DX modules with queries like "pagopa-dx azure function" or "pagopa-dx azure app service"
   - Get module details including inputs, outputs, and usage examples
   - Always use the latest available version from the Registry

2. **Ask the user for required values** when they are not available in the existing codebase:
   - `environment` values: prefix, env_short, location, domain, app_name, instance_number
   - `tags` values: BusinessUnit, ManagementTeam
   - Backend state configuration: storage account, resource group, container name

3. **Prefer multiple-choice questions over free-form input** when asking the user:
   - `env_short`: offer "p (prod)", "d (dev)", "u (uat)"
   - `location`: offer "italynorth", "westeurope", "germanywestcentral"
   - `BusinessUnit`: offer "App IO", "CGN", "Carta della Cultura", "IT Wallet", "DevEx", or "Other (specify)"
   - `ManagementTeam`: offer "IO Platform", "IO Wallet", "IO Comunicazione", "IO Enti & Servizi", "IO Autenticazione", "IO Bonus & Pagamenti", "IO Firma", "Developer Experience", or "Other (specify)"
   - Use free-form only for truly unknown values like `prefix`, `domain`, `app_name`

4. **Never assume default values** for project-specific configuration. If you cannot find these values in the workspace, ask the user.

## Quick Start

### Required Structure

Every repository with infrastructure code must have:

```
infra/
├─ repository/      # GitHub repository settings
├─ bootstrapper/    # GitHub runner and identities
│  ├─ prod/
│  └─ dev/
├─ resources/       # Your infrastructure definitions
│  ├─ _modules/     # (Optional) Project-specific modules
│  ├─ dev/
│  └─ prod/
```

## DX Terraform Providers

The DX providers simplify resource naming and subnet allocation following PagoPA conventions.

### Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }
}

provider "dx" {}
```

For AWS, use `pagopa-dx/aws` instead.

### Resource Naming Function

Generate standardized resource names with `provider::dx::resource_name()`:

```hcl
resource "azurerm_linux_function_app" "this" {
  name = provider::dx::resource_name({
    prefix          = "dx"
    environment     = "p"
    location        = "itn"
    domain          = "myapp"
    name            = "api"
    resource_type   = "function_app"
    instance_number = 1
  })
  # Output: dx-p-itn-myapp-api-func-01
}
```

Common resource types: `function_app`, `app_service`, `key_vault`, `storage_account`, `cosmos_account`, `resource_group`, `subnet`, `private_endpoint`.

### Automatic Subnet CIDR Allocation

Find the next available CIDR block in a VNet:

```hcl
resource "dx_available_subnet_cidr" "my_subnet" {
  virtual_network_id = data.azurerm_virtual_network.this.id
  prefix_length      = 24  # /24 subnet
}

resource "azurerm_subnet" "my_subnet" {
  name                 = "my-subnet"
  resource_group_name  = data.azurerm_resource_group.network.name
  virtual_network_name = data.azurerm_virtual_network.this.name
  address_prefixes     = [dx_available_subnet_cidr.my_subnet.cidr_block]
}
```

**Multiple subnets**: Use `depends_on` to prevent CIDR overlaps:

```hcl
resource "dx_available_subnet_cidr" "subnet_2" {
  virtual_network_id = data.azurerm_virtual_network.this.id
  prefix_length      = 24

  depends_on = [azurerm_subnet.subnet_1]
}
```

## Using DX Registry Modules

Browse all modules: [registry.terraform.io/namespaces/pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx)

### Common Modules

| Module                               | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `azure-github-environment-bootstrap` | Set up GitHub runners and identities    |
| `azure-core-infra`                   | VNet, Key Vault, DNS, Log Analytics     |
| `azure-core-values-exporter`         | Read shared infrastructure values       |
| `azure-function-app`                 | Deploy Function Apps with networking    |
| `azure-app-service`                  | Deploy App Services with staging slot   |
| `azure-role-assignments`             | Assign IAM roles to resources           |
| `azure-cosmos-account`               | Deploy Cosmos DB with private endpoints |
| `azure-storage-account`              | Deploy Storage Accounts securely        |

### Module Source Pattern

**Always use Registry source with semantic versioning:**

```hcl
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = local.environment
  # ...
}
```

### The `environment` Variable

Most DX modules require an `environment` object for naming. **Ask the user for these values if not found in the codebase:**

```hcl
locals {
  environment = {
    prefix          = "<product>"    # Product prefix (e.g., "io", "cgn", "cdc") - ASK USER
    env_short       = "<env>"        # p=prod, d=dev, u=uat - ASK USER
    location        = "italynorth"   # Azure region
    domain          = "<domain>"     # (Optional) Domain name - ASK USER
    app_name        = "<app>"        # Application name - ASK USER
    instance_number = "01"           # Instance number
  }
}
```

## Deploying Common Resources

### Role Assignments

Use abstracted roles (`reader`, `writer`, `owner`) instead of Azure role names:

```hcl
module "app_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id    = module.my_function.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  # Cosmos DB access
  cosmos = [{
    account_name        = azurerm_cosmosdb_account.this.name
    resource_group_name = azurerm_resource_group.this.name
    role                = "writer"  # reader, writer, owner
    description         = "Function App writes to Cosmos"
  }]

  # Storage Blob access
  storage_blob = [{
    storage_account_name = azurerm_storage_account.this.name
    resource_group_name  = azurerm_resource_group.this.name
    role                 = "reader"
    description          = "Function App reads blobs"
  }]

  # Key Vault access
  key_vault = [{
    name                = data.azurerm_key_vault.common.name
    resource_group_name = data.azurerm_key_vault.common.resource_group_name
    roles = {
      secrets = "reader"
    }
    description = "Function App reads secrets"
  }]
}
```

## Code Style

### File Organization

Organize code into dedicated files:

| File                         | Content                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `locals.tf`                  | Local values, naming configs, computed values                  |
| `providers.tf`               | Terraform block, required providers, backend, provider configs |
| `variables.tf`               | Input variables with descriptions and validations              |
| `outputs.tf`                 | Output values with descriptions                                |
| `main.tf` or `<resource>.tf` | Resources and modules (e.g., `azure.tf`, `function.tf`)        |
| `data.tf`                    | Data sources                                                   |

### Variable Definitions

**Always include descriptions and validations:**

```hcl
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

### Output Definitions

**Group related outputs in objects:**

```hcl
output "function_app" {
  description = "Details of the Function App including resource group, plan, and app information."
  value = {
    resource_group_name = azurerm_linux_function_app.this.resource_group_name
    plan = {
      id   = azurerm_service_plan.this.id
      name = azurerm_service_plan.this.name
    }
    function_app = {
      id               = azurerm_linux_function_app.this.id
      name             = azurerm_linux_function_app.this.name
      principal_id     = azurerm_linux_function_app.this.identity[0].principal_id
      default_hostname = azurerm_linux_function_app.this.default_hostname
    }
  }
}
```

### Locals Best Practices

**Use a `naming_config` local for resource names:**

```hcl
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

### count vs for_each

**Prefer `for_each` over `count`** for resources that need stable identifiers:

```hcl
# ✅ GOOD - Use for_each with maps/sets for named resources
resource "azurerm_resource_group" "this" {
  for_each = var.environments  # map or set

  name     = "rg-${each.key}"
  location = each.value.location
}

# ⚠️ OK - Use count only for simple enable/disable patterns
resource "azurerm_subnet" "optional" {
  count = var.create_subnet ? 1 : 0

  name = "my-subnet"
  # ...
}

# ❌ AVOID - count with lists (index changes cause recreation)
resource "azurerm_subnet" "bad" {
  count = length(var.subnet_names)
  name  = var.subnet_names[count.index]  # Risky!
}
```

### Required Tags

All resources must include these tags. **Ask the user for BusinessUnit and ManagementTeam if not found in the codebase:**

```hcl
locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"  # Always this value
    CreatedBy      = "Terraform"                     # Always "Terraform"
    Environment    = "Prod"                          # Prod, Dev, Uat - based on environment folder
    BusinessUnit   = "<business-unit>"               # ASK USER: "App IO", "CGN", "IT Wallet", "DevEx", ...
    Source         = "https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"
    ManagementTeam = "<team>"                        # ASK USER: "IO Platform", "IO Wallet", "Developer Experience", ...
  }
}
```

### Secrets Management

**Never hardcode secrets in Terraform.** Use Key Vault references in AppSettings:

```hcl
# ✅ GOOD - Reference secrets from Key Vault
app_settings = {
  DB_CONNECTION_STRING = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=db-connection)"
  API_KEY              = "@Microsoft.KeyVault(SecretUri=https://${local.key_vault_name}.vault.azure.net/secrets/api-key)"
}

# ❌ BAD - Secret in Terraform (visible in state file!)
app_settings = {
  DB_CONNECTION_STRING = "Server=myserver;Password=secret123"
}
```

**Store sensitive outputs in Key Vault:**

```hcl
resource "azurerm_key_vault_secret" "connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.this.primary_connection_string
  key_vault_id = data.azurerm_key_vault.common.id

  tags = local.tags
}
```

### Local Modules (`_modules/`)

Use `_modules/` for project-specific reusable components:

```
infra/resources/
├── _modules/
│   └── my_app/           # Reusable within this project
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── dev/
│   └── azure.tf          # source = "../_modules/my_app"
└── prod/
    └── azure.tf          # source = "../_modules/my_app"
```

**Reference local modules with relative paths:**

```hcl
module "my_app" {
  source = "../_modules/my_app"

  environment = local.environment
  tags        = local.tags
}
```

### Standard locals.tf

**Note:** Replace placeholder values with actual project values. Ask the user if not found in the codebase.

```hcl
locals {
  environment = {
    prefix          = "<product>"      # ASK USER
    env_short       = "<env>"          # p, d, u
    location        = "italynorth"
    domain          = "<domain>"       # ASK USER (optional)
    app_name        = "<app>"          # ASK USER
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"            # Based on folder: Prod, Dev, Uat
    BusinessUnit   = "<business-unit>" # ASK USER
    Source         = "https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"
    ManagementTeam = "<team>"          # ASK USER
  }
}
```

### Standard providers.tf

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-p-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "myapp.resources.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}
```

## DX Code Review Checklist

When generating or reviewing Terraform code for PagoPA projects, verify:

### DX Modules & Providers

- [ ] **Always use DX Registry modules (`pagopa-dx/*`)** — only use raw `azurerm`/`aws` resources if the specific use case is not supported by a DX module
- [ ] DX provider configured for resource naming (`pagopa-dx/azure` or `pagopa-dx/aws`)
- [ ] `provider::dx::resource_name()` used for all resource names
- [ ] Module versions use pessimistic constraint (`~> X.Y`)

### Project Structure

- [ ] Code is in `infra/resources/<env>/` folder structure
- [ ] Local modules (if any) are in `infra/resources/_modules/`
- [ ] Environment folders match (`dev/`, `prod/`, `uat/`)

### Configuration Patterns

- [ ] `environment` variable follows standard structure (prefix, env_short, location, domain, app_name, instance_number)
- [ ] Backend state key follows naming: `<project>.<layer>.<env>.tfstate`

### Required Tags

- [ ] All resources include required tags (CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam)
- [ ] `Source` tag points to the correct GitHub repository path

### Security

- [ ] Secrets use Key Vault references (`@Microsoft.KeyVault(...)`) in app_settings
- [ ] No sensitive values hardcoded in Terraform code
- [ ] Role assignments use DX `azure-role-assignments` module with abstracted roles

### Before Committing

- [ ] Run `pre-commit run -a` on staged files before every commit

---

## Troubleshooting

For common issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
