---
name: terraform-dx-best-practices
description: Guides Terraform code authoring following PagoPA DX conventions. Use when writing or reviewing Terraform configurations (.tf files), deploying Azure/AWS infrastructure, or using DX Registry modules.
---

# Terraform DX Best Practices

## Agent Instructions

When generating Terraform code, follow these instructions:

### 1. Search DX Documentation for Best Practices

**Always query the DX documentation** for up-to-date best practices before generating code. Make a POST request to the DX Search API:

```bash
curl -X POST https://api.dx.pagopa.it/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "<search_query>",
    "number_of_results": 5
  }'
```

Search for these topics:

- "Terraform folder structure" - for project organization
- "Terraform code style" - for file organization, variables, outputs, locals
- "Terraform required tags" - for mandatory resource tags
- "Azure naming convention" - for resource naming patterns
- "DX Terraform modules" - for available modules and usage
- "Terraform pre-commit hooks" - for validation setup
- "Key Vault references AppSettings" - for secrets management

The API returns a JSON object with:

- `query`: The search query
- `results`: Array of result objects containing `content`, `score`, and `source` URL

### 2. Check Terraform Registry for Module Versions

**Always use tools to get the latest module versions** from the Terraform Registry before writing module blocks:

- Search for DX modules in the `pagopa-dx` namespace
- Get module details including inputs, outputs, and usage examples
- Always use the latest available version

### 3. Ask User for Required Values

**Ask the user for project-specific values** when not found in the existing codebase:

- `environment` values: prefix, env_short, location, domain, app_name, instance_number
- `tags` values: BusinessUnit, ManagementTeam
- Backend state configuration

### 4. Prefer Multiple-Choice Questions

When asking the user, offer choices when possible:

- `env_short`: "p (prod)", "d (dev)", "u (uat)"
- `location`: "italynorth", "westeurope", "germanywestcentral"
- `BusinessUnit`: "App IO", "CGN", "Carta della Cultura", "IT Wallet", "DevEx", or "Other (specify)"
- `ManagementTeam`: "IO Platform", "IO Wallet", "IO Comunicazione", "IO Enti & Servizi", "IO Autenticazione", "IO Bonus & Pagamenti", "IO Firma", "Developer Experience", or "Other (specify)"

Use free-form only for truly unknown values like `prefix`, `domain`, `app_name`.

### 5. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

---

## Quick Reference

This section provides a minimal quick reference. **Always search DX documentation for detailed and up-to-date information.**

### Required Project Structure

```
infra/
├─ repository/      # GitHub repository settings
├─ bootstrapper/    # GitHub runner and identities
│  ├─ prod/
│  └─ dev/
├─ resources/       # Infrastructure definitions
│  ├─ _modules/     # (Optional) Project-specific modules
│  ├─ dev/
│  └─ prod/
```

### DX Registry Modules

**Always use DX Registry modules** (`pagopa-dx/*`) instead of raw `azurerm`/`aws` resources when available.

Browse modules: [registry.terraform.io/namespaces/pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx)

```hcl
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> X.Y"  # Always check Registry for latest version

  environment = local.environment
  # ...
}
```

### DX Provider for Resource Naming

```hcl
terraform {
  required_providers {
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }
}

# Generate standardized names
name = provider::dx::resource_name({
  prefix          = "<prefix>"
  environment     = "<env_short>"
  location        = "<location_short>"
  domain          = "<domain>"
  name            = "<app_name>"
  resource_type   = "function_app"
  instance_number = 1
})
```

### Required Tags

```hcl
locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"  # Always this value
    CreatedBy      = "Terraform"                     # Always "Terraform"
    Environment    = "Prod"                          # Prod, Dev, Uat
    BusinessUnit   = "<business-unit>"               # ASK USER
    Source         = "https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"
    ManagementTeam = "<team>"                        # ASK USER
  }
}
```

### The `environment` Variable

```hcl
locals {
  environment = {
    prefix          = "<product>"    # ASK USER (e.g., "io", "cgn")
    env_short       = "<env>"        # ASK USER: p, d, u
    location        = "italynorth"   # Azure region
    domain          = "<domain>"     # ASK USER (optional)
    app_name        = "<app>"        # ASK USER
    instance_number = "01"
  }
}
```

---

## DX Code Review Checklist

### DX Modules & Providers

- [ ] **Always use DX Registry modules (`pagopa-dx/*`)** — only use raw resources if the specific use case is not supported
- [ ] DX provider configured for resource naming (`pagopa-dx/azure` or `pagopa-dx/aws`)
- [ ] `provider::dx::resource_name()` used for all resource names
- [ ] Module versions are the latest from Registry

### Project Structure

- [ ] Code is in `infra/resources/<env>/` folder structure
- [ ] Local modules (if any) are in `infra/resources/_modules/`

### Configuration

- [ ] `environment` variable follows standard structure
- [ ] All resources include required tags

### Security

- [ ] Secrets use Key Vault references (`@Microsoft.KeyVault(...)`)
- [ ] No sensitive values hardcoded in Terraform code

### Before Committing

- [ ] Run `pre-commit run -a` on staged files

---

## Additional Resources

For detailed documentation, search the DX knowledge base or visit:

- [DX Documentation](https://dx.pagopa.it/docs/)
- [Terraform Best Practices](https://dx.pagopa.it/docs/terraform/)
- [Azure Naming Conventions](https://dx.pagopa.it/docs/azure/azure-naming-convention)
- [DX Terraform Modules](https://registry.terraform.io/namespaces/pagopa-dx)
