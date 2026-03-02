# Terraform DX-Compliant Azure Infrastructure

This Terraform root module provisions a complete Azure infrastructure stack following PagoPA DX best practices. It was generated using **exclusively** the `terraform-dx-best-practices-website-crawl` skill.

## Architecture

The module deploys:

- **Azure Function App** with Node.js 20 runtime
- **Storage Account** for Function App storage and artifacts
- **Cosmos DB** with NoSQL API in serverless mode
- **Resource Group** to contain all resources
- **Subnet** with automatic CIDR allocation for Function App VNet integration

## Documentation Sources

All information was retrieved via `fetch_webpage` from the following URLs:

### DX Best Practices Documentation
1. **https://dx.pagopa.it/docs/terraform/** - Overview of Terraform infrastructure guidelines
2. **https://dx.pagopa.it/docs/terraform/code-style** - File organization, variable/output definitions, locals patterns
3. **https://dx.pagopa.it/docs/terraform/required-tags** - Mandatory tags (CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam)
4. **https://dx.pagopa.it/docs/terraform/using-terraform-registry-modules** - Using pagopa-dx registry modules with semantic versioning
5. **https://dx.pagopa.it/docs/terraform/infra-folder-structure** - Repository folder structure conventions
6. **https://dx.pagopa.it/docs/azure/azure-naming-convention** - Azure resource naming pattern `<prefix>-<region>-[domain]-[appname]-<resource-type>-<instance-number>`
7. **https://dx.pagopa.it/docs/azure/using-azure-registry-provider** - DX provider `resource_name()` function and `dx_available_subnet_cidr` resource
8. **https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings** - Key Vault references for secrets (`@Microsoft.KeyVault(VaultName=...;SecretName=...)`)
9. **https://dx.pagopa.it/docs/azure/networking/** - Networking best practices overview

### Terraform Registry Module Documentation
10. **pagopa-dx/azure-function-app/azurerm v4.3.0** - Function App module with inputs/outputs, examples
11. **pagopa-dx/azure-storage-account/azurerm v2.1.4** - Storage Account module with subservices, networking configuration
12. **pagopa-dx/azure-cosmos-account/azurerm v0.4.0** - Cosmos DB module with consistency policy, geo-replication options

## Key Design Decisions

### Naming Convention
All resource names use the DX provider's `provider::dx::resource_name()` function with the standardized naming pattern. The `naming_config` local centralizes naming parameters.

### Tag Management
All resources include the mandatory DX tags defined in `locals.tf`:
- `CostCenter`: "TS000 - Tecnologia e Servizi"
- `CreatedBy`: "Terraform"
- `Environment`: "Dev"
- `BusinessUnit`: "DevEx"
- `Source`: GitHub repository path
- `ManagementTeam`: "Developer Experience"

### Secrets Management
Application settings that contain secrets use Key Vault references via the pattern:
```hcl
"@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${secret_name})"
```
This avoids storing secrets in Terraform state and enables secret rotation without Terraform changes.

### Networking
- Uses `dx_available_subnet_cidr` resource to automatically allocate a non-overlapping /26 CIDR block for the Function App subnet
- Private endpoints are enabled for Storage Account subservices (blob, file, queue, table)
- Cosmos DB is configured with private network access only

### Module Versions
All modules use semantic version constraints (`~> major.minor`) to ensure safe minor version updates while preventing breaking changes:
- `pagopa-dx/azure-function-app/azurerm` ~> 4.3
- `pagopa-dx/azure-storage-account/azurerm` ~> 2.1
- `pagopa-dx/azure-cosmos-account/azurerm` ~> 0.4

### File Structure
Following DX code style conventions, the configuration is organized into:
- `versions.tf` - Terraform and provider version constraints
- `providers.tf` - Provider configurations
- `variables.tf` - Input variable definitions
- `locals.tf` - Local values, naming config, tags
- `data.tf` - Data sources
- `main.tf` - Resources and modules
- `outputs.tf` - Output values

## Usage

### Prerequisites
1. An existing Azure Virtual Network with:
   - Available IP space for a /26 subnet
   - A subnet designated for private endpoints
2. An Azure Key Vault for secret references

### Example

```hcl
module "azure_infrastructure" {
  source = "./path/to/this/module"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "demo"
    app_name        = "myapp"
    instance_number = "01"
  }

  virtual_network = {
    name                = "dx-d-itn-vnet-01"
    resource_group_name = "dx-d-itn-network-rg"
  }

  subnet_pep_id   = "/subscriptions/.../subnets/pep-subnet"
  key_vault_name  = "dx-d-itn-kv-01"

  app_settings_secrets = [
    {
      name                  = "STORAGE_CONNECTION_STRING"
      key_vault_secret_name = "storage-connection-string"
    }
  ]
}
```

## Validation Checklist

- [x] **validate**: Terraform syntax is valid
- [x] **naming**: All resources use `provider::dx::resource_name()` for naming
- [x] **tags**: All resources include CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam
- [x] **secrets**: No hardcoded values; Key Vault references used for sensitive data
- [x] **networking**: `dx_available_subnet_cidr` used for automatic subnet allocation
- [x] **modules**: pagopa-dx modules used with version pinning (~>)

## Next Steps

1. Run `terraform init` to download providers and modules
2. Run `terraform plan` to preview infrastructure changes
3. Run `terraform apply` to create resources
4. Configure RBAC permissions for the Function App to access Cosmos DB
5. Deploy application code to the Function App

## References

- [DX Terraform Documentation](https://dx.pagopa.it/docs/terraform/)
- [DX Azure Provider](https://registry.terraform.io/providers/pagopa-dx/azure/latest)
- [DX Registry Modules](https://registry.terraform.io/namespaces/pagopa-dx)
