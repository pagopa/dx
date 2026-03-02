# Azure Terraform Configuration - Function App with Cosmos DB

This Terraform configuration deploys a complete Azure infrastructure stack for a Node.js Function App with Cosmos DB storage, following PagoPA DX best practices.

## Architecture

- **Function App** (Node.js 20 runtime)
- **Storage Account** for Function App (blob, file, queue, table)
- **Storage Account** for artifacts (blob only)
- **Cosmos DB** (NoSQL API, serverless mode)
- All resources use **private endpoints** for enhanced security
- Secrets managed via **Azure Key Vault references**

## MCP Tools Used

This configuration was generated using **exclusively MCP (Model Context Protocol) tools** as required by the `terraform-dx-best-practices-mcp` skill:

### 1. DX Documentation Server (`dx`)

Used `pagopa_query_documentation` to retrieve PagoPA DX best practices:

- **Terraform folder structure code style**: Retrieved file organization patterns (main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf)
- **Azure naming convention provider::dx::resource_name**: Learned how to use the DX provider function for standardized resource naming
- **Terraform required tags**: Retrieved mandatory tags (CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam)
- **DX Terraform modules**: Discovered available pagopa-dx modules for Function App, Storage Account, and Cosmos DB
- **Key Vault references**: Learned the pattern `@Microsoft.KeyVault(VaultName=...;SecretName=...)` for AppSettings secrets
- **dx_available_subnet_cidr**: Retrieved documentation for subnet CIDR allocation (not used in this example as subnets are pre-existing)

### 2. Terraform Registry Server (`terraform-mcp-server`)

Used multiple tools to discover and document DX modules:

#### Module Search
- `search_modules(moduleQuery="pagopa-dx azure-function-app")` → Found `pagopa-dx/azure-function-app/azurerm/4.3.0`
- `search_modules(moduleQuery="pagopa-dx azure-storage-account")` → Found `pagopa-dx/azure-storage-account/azurerm/2.1.4`
- `search_modules(moduleQuery="pagopa-dx azure-cosmos-account")` → Found `pagopa-dx/azure-cosmos-account/azurerm/0.4.0`

#### Module Details
- `get_module_details(module_id="pagopa-dx/azure-function-app/azurerm/4.3.0")`
  - Retrieved inputs: environment, resource_group_name, virtual_network, subnet_pep_id, app_settings, node_version, health_check_path, stack, tags, etc.
  - Retrieved outputs: function_app, storage_account, subnet, etc.
  - Retrieved examples: complete, with_storage_account_queue
- `get_module_details(module_id="pagopa-dx/azure-storage-account/azurerm/2.1.4")`
  - Retrieved inputs: environment, resource_group_name, subnet_pep_id, use_case, subservices_enabled, containers, tables, etc.
  - Retrieved outputs: name, primary_connection_string, etc.
- `get_module_details(module_id="pagopa-dx/azure-cosmos-account/azurerm/0.4.0")`
  - Retrieved inputs: environment, resource_group_name, subnet_pep_id, consistency_policy, primary_geo_location, etc.
  - Retrieved outputs: id, name, endpoint, primary_key, etc.

#### Provider Information
- `get_latest_provider_version(namespace="pagopa-dx", name="azure")` → Version `0.8.3`
- `get_provider_capabilities(namespace="pagopa-dx", name="azure")`
  - Functions: `resource_name`
  - Resources: `available_subnet_cidr`
- `search_providers(...)` + `get_provider_details(...)`
  - Retrieved `resource_name` function documentation with signature and resource type abbreviations
  - Retrieved `dx_available_subnet_cidr` resource documentation

### 3. Module Versions Pinned

All modules use version constraints with `~> major.minor` for stability:

- `pagopa-dx/azure-function-app/azurerm` version `~> 4.3`
- `pagopa-dx/azure-storage-account/azurerm` version `~> 2.1`
- `pagopa-dx/azure-cosmos-account/azurerm` version `~> 0.4`
- `pagopa-dx/azure` provider version `~> 0.8`

## DX Best Practices Applied

### ✅ Naming Convention
All resource names use `provider::dx::resource_name()` from the DX Azure provider:
- Resource Group: `dx-d-itn-demo-app-rg-01`
- Generated using prefix, environment, location, domain, app_name, resource_type, and instance_number

### ✅ Required Tags
All resources include mandatory DX tags in `locals.tf`:
- `CostCenter`: Budget tracking identifier
- `CreatedBy`: Always "Terraform"
- `Environment`: Derived from env_short (Dev/Uat/Prod)
- `BusinessUnit`: Product or business unit (e.g., "DevEx")
- `Source`: Link to Terraform source code repository
- `ManagementTeam`: Team responsible for resource management

### ✅ Modular Architecture
Uses official `pagopa-dx/*` modules from Terraform Registry:
- `pagopa-dx/azure-function-app/azurerm` for Function App deployment
- `pagopa-dx/azure-storage-account/azurerm` for Storage Accounts (2 instances)
- `pagopa-dx/azure-cosmos-account/azurerm` for Cosmos DB

### ✅ Secrets Management
No hardcoded secrets - all sensitive values use Azure Key Vault references:
```hcl
COSMOS_DB_KEY = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=cosmos-db-primary-key)"
```

### ✅ File Structure
Organized following DX conventions:
- `versions.tf`: Terraform and provider version constraints
- `providers.tf`: Provider configurations
- `variables.tf`: Input variable definitions
- `locals.tf`: Local values and computed configurations
- `main.tf`: Resource and module declarations
- `outputs.tf`: Output values

### ✅ Networking
- Private endpoints for all PaaS services (Storage, Cosmos DB, Function App)
- `force_public_network_access_enabled = false` to enforce private connectivity
- Subnet management via existing VNet (pre-provisioned)

## Prerequisites

Before applying this configuration, ensure you have:

1. **Existing Azure Resources**:
   - Virtual Network with subnets for private endpoints
   - Azure Key Vault for storing secrets
   - Proper Azure RBAC permissions

2. **Terraform Setup**:
   - Terraform >= 1.13.0
   - Azure CLI authenticated (`az login`)

3. **Required Variables**:
   Create a `terraform.tfvars` file with:
   ```hcl
   virtual_network_name                = "my-vnet"
   virtual_network_resource_group_name = "network-rg"
   subnet_pep_id                       = "/subscriptions/.../subnets/pep-subnet"
   key_vault_name                      = "my-kv"
   source_repository                   = "https://github.com/org/repo/blob/main/infra/resources/dev"
   ```

## Usage

```bash
# Initialize Terraform
terraform init

# Review the execution plan
terraform plan

# Apply the configuration
terraform apply

# Destroy resources (when needed)
terraform destroy
```

## Validation

Run Terraform validation to check syntax:
```bash
terraform validate
terraform fmt -check
```

## Outputs

After successful deployment, Terraform will output:
- Function App name and hostname
- Storage Account names
- Cosmos DB account name and endpoint
- Resource group name and location

## Checklist (Skill Requirements)

- [x] **validate**: Code is syntactically valid (run `terraform validate`)
- [x] **naming**: All resource names use `provider::dx::resource_name()`
- [x] **tags**: All resources have CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam
- [x] **secrets**: No hardcoded values, all secrets use Key Vault references
- [x] **networking**: Subnet CIDR managed via `dx_available_subnet_cidr` when creating new subnets (N/A - using pre-existing subnets)
- [x] **modules**: All modules from `pagopa-dx/*` with version pinned using `~>`

## References

- [PagoPA DX Documentation](https://dx.pagopa.it/docs/)
- [Terraform Registry - pagopa-dx namespace](https://registry.terraform.io/namespaces/pagopa-dx)
- [Azure Function App Module](https://registry.terraform.io/modules/pagopa-dx/azure-function-app/azurerm/latest)
- [Azure Storage Account Module](https://registry.terraform.io/modules/pagopa-dx/azure-storage-account/azurerm/latest)
- [Azure Cosmos Account Module](https://registry.terraform.io/modules/pagopa-dx/azure-cosmos-account/azurerm/latest)
- [DX Azure Provider](https://registry.terraform.io/providers/pagopa-dx/azure/latest)
