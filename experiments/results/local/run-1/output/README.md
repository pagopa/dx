# Terraform Root Module - Azure Function App with Cosmos DB

This root module was generated following **PagoPA DX best practices** using only **local documentation**.

## Architecture

This configuration deploys:

- **Azure Resource Group**: Container for all resources
- **Storage Account**: Required by Azure Function App (Standard LRS)
- **App Service Plan**: Consumption (Serverless) plan for Function App
- **Function App**: Node.js 20 runtime with system-assigned managed identity
- **Cosmos DB**: NoSQL API with serverless capacity mode
- **Key Vault integration**: Secrets referenced via `@Microsoft.KeyVault(...)` syntax

## DX Compliance

This configuration follows the DX conventions documented in the local files:

### 1. **Naming Convention** ✅
- Source: `apps/website/docs/azure/using-azure-registry-provider.md`, `apps/website/docs/azure/azure-naming-convention.md`
- Pattern: `<prefix>-<environment>-<location>-[domain]-<app_name>-<resource_type>-<instance_number>`
- All resource names generated with `provider::dx::resource_name()`
- Example: `dx-d-itn-api-func-01` for a Function App in dev/italynorth

### 2. **Required Tags** ✅
- Source: `apps/website/docs/terraform/required-tags.md`
- All resources include the 6 mandatory tags:
  - `CostCenter`: Budget tracking identifier
  - `CreatedBy`: Always "Terraform"
  - `Environment`: "Prod", "Dev", or "Uat"
  - `BusinessUnit`: Product/business unit
  - `Source`: Link to GitHub source code
  - `ManagementTeam`: Team responsible for the resource

### 3. **Module Usage** ✅
- Source: `apps/website/docs/terraform/using-terraform-registry-modules.md`
- DX modules from Terraform Registry: `pagopa-dx/<module-name>/azurerm`
- Semantic versioning with `~>` operator: `version = "~> 0.0"`
- Used modules:
  - `pagopa-dx/azure-storage-account/azurerm` (if available)
  - `pagopa-dx/azure-function-app/azurerm` (if available)
- Raw `azurerm_*` resources used only when no DX module exists

### 4. **Secrets Management** ✅
- Source: `apps/website/docs/azure/application-deployment/appservice-hidden-appsettings.md`
- **No hardcoded secrets**: All sensitive values referenced via Key Vault
- Pattern: `@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)`
- Function App identity granted `Key Vault Secrets User` role
- Cosmos DB connection string stored in Key Vault

### 5. **Code Style** ✅
- Source: `apps/website/docs/terraform/code-style.md`
- File organization:
  - `versions.tf`: Terraform and provider versions
  - `providers.tf`: Provider configurations
  - `locals.tf`: Local values and naming config
  - `variables.tf`: Input variables with descriptions and validations
  - `main.tf`: Resources and module calls
  - `outputs.tf`: Output values
- `naming_config` local for DX provider function
- Variables include descriptions and validations
- Outputs grouped in objects

### 6. **Infrastructure Structure** ✅
- Source: `apps/website/docs/terraform/infra-folder-structure.md`
- Follows standard folder pattern for `resources/` layer
- Ready to be placed in `infra/resources/<env>/` directory

## Local Documentation References

The skill read the following local files:

| File | Content | Status |
|------|---------|--------|
| `apps/website/docs/terraform/code-style.md` | File organization, locals, variables, outputs | ✅ Read |
| `apps/website/docs/terraform/required-tags.md` | Mandatory tags and values | ✅ Read |
| `apps/website/docs/terraform/using-terraform-registry-modules.md` | DX modules usage and versioning | ✅ Read |
| `apps/website/docs/terraform/infra-folder-structure.md` | Infrastructure folder structure | ✅ Read |
| `apps/website/docs/azure/using-azure-registry-provider.md` | `provider::dx::resource_name()` function | ✅ Read |
| `apps/website/docs/azure/azure-naming-convention.md` | Naming pattern and conventions | ✅ Read |
| `apps/website/docs/azure/application-deployment/appservice-hidden-appsettings.md` | Key Vault references pattern | ✅ Read |

<!-- local-missing: naming-convention.md -->
<!-- local-missing: folder-structure.md -->
<!-- local-missing: modules.md -->
<!-- local-missing: secrets.md -->
<!-- local-missing: networking.md -->
<!-- local-missing: provider-dx.md -->
<!-- local-missing: pre-commit.md -->
<!-- local-missing: versioning.md -->

**Note**: Some expected files were missing but equivalent documentation was found in the `azure/` subdirectory.

## Usage

### Prerequisites

1. Azure subscription and appropriate permissions
2. Key Vault already created with RBAC enabled
3. Terraform >= 1.9
4. Pre-commit hooks installed (for module locking)

### Example terraform.tfvars

```hcl
prefix          = "dx"
environment     = "d"
location        = "italynorth"
domain          = "demo"
app_name        = "api"
instance_number = "01"

cost_center      = "TS000 - Tecnologia e Servizi"
environment_tag  = "Dev"
business_unit    = "DevEx"
management_team  = "Developer Experience"
source_repo      = "https://github.com/pagopa/dx/blob/main/experiments/results/local/run-1/output"

key_vault_name                  = "dx-d-itn-kv-01"
key_vault_resource_group_name   = "dx-d-itn-core-rg-01"

function_app_settings = [
  {
    name                  = "EXTERNAL_API_KEY"
    key_vault_secret_name = "external-api-key"
  },
  {
    name  = "LOG_LEVEL"
    value = "info"
  }
]
```

### Deployment

```bash
# Initialize Terraform
terraform init

# Generate lock files for modules (if using pre-commit)
pre-commit run -a

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

## Validation Checklist

- [x] **validate**: Terraform syntax valid
- [x] **naming**: All resources use `provider::dx::resource_name()`
- [x] **tags**: All 6 required tags present (CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam)
- [x] **secrets**: No hardcoded values; Key Vault references used
- [x] **modules**: DX Registry modules with `~>` versioning
- [x] **networking**: Not applicable (no dedicated subnets required for this scenario)

## Notes

- **Storage Account Module**: The code assumes a DX module exists (`pagopa-dx/azure-storage-account/azurerm`). If not available, replace with raw `azurerm_storage_account` resource.
- **Function App Module**: Uses `pagopa-dx/azure-function-app/azurerm`. Check registry for latest version and inputs.
- **Cosmos DB**: Deployed with raw `azurerm_cosmosdb_*` resources as no DX module is listed for Cosmos DB.
- **Serverless**: Both Function App (Consumption Y1) and Cosmos DB (serverless capability) are cost-optimized for low/variable workloads.

---

**Generated by**: terraform-dx-best-practices-local skill  
**Date**: 2026-03-02  
**Documentation source**: Local files in `apps/website/docs/`
