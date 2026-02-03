---
name: terraform-dx-best-practices
description: Guides Terraform code authoring following PagoPA DX conventions. Use when writing or reviewing Terraform configurations (.tf files), deploying Azure/AWS infrastructure, or using DX Registry modules.
---

# Terraform DX Best Practices

## Agent Instructions

When generating Terraform code, follow these instructions:

### 1. Search DX Documentation for Best Practices

**Always query the DX documentation** for up-to-date best practices before generating code.

**Prefer delegating to a subagent** for documentation searches to save context. Instruct the subagent to:

- Make POST requests to the DX Search API: `https://api.dx.pagopa.it/search`
- Search for relevant topics and summarize key findings
- Return concise, actionable information

Alternatively, make a direct POST request to the DX Search API:

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

**Always use Terraform HashiCorp MCP tools**, if present, to retrieve module information from the Terraform Registry:

- Call `search_modules` to find DX modules in the `pagopa-dx` namespace
- Call `get_module_details` to retrieve module inputs, outputs, required providers, and usage examples
- Call `get_latest_module_version` to get the most recent version
- Always use the latest available version in your code

Otherwise consider to query Terraform registry using its API as described here: https://developer.hashicorp.com/terraform/registry/api-docs

Example: For the `azure-function-app` module, retrieve details from:
`https://registry.terraform.io/modules/pagopa-dx/azure-function-app/azurerm/latest`

### 3. Ask User for Required Values

**Ask the user for project-specific values** when not found in the existing codebase:

- **Module use_case**: Present all available `use_case` options from the chosen modules' documentation and **always ask the user to select the appropriate one** (e.g., "default", "high_load", "spot")
- `environment` values: prefix, env_short, location, domain, app_name, instance_number
- `tags` values: BusinessUnit, ManagementTeam
- Backend state configuration

### 4. Prefer Multiple-Choice Questions

When asking the user, offer choices when possible:

- `env_short`: "p (prod)", "d (dev)", "u (uat)"
- `location`: "italynorth", "westeurope", "spaincentral"
- `BusinessUnit`: "App IO", "CGN", "Carta della Cultura", "IT Wallet", "DevEx", or "Other (specify)"
- `ManagementTeam`: "IO Platform", "IO Wallet", "IO Comunicazione", "IO Enti & Servizi", "IO Autenticazione", "IO Bonus & Pagamenti", "IO Firma", "Developer Experience", or "Other (specify)"

Use free-form only for truly unknown values like `prefix`, `domain`, `app_name`.

### 5. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

---

## DX Code Review Checklist

### DX Modules & Providers

- [ ] **Always use DX Registry modules (`pagopa-dx/*`)** — only use raw resources if the specific use case is not supported
- [ ] DX provider configured for resource naming (`pagopa-dx/azure` or `pagopa-dx/aws`)
- [ ] `provider::dx::resource_name()` used for all resource names
- [ ] Module versions specified using `~>` operator with major and minor versions only (e.g., `~> 1.5`)
  - Ensures compatibility while allowing patch updates
  - See [Semantic Versioning](https://dx.pagopa.it/docs/azure/using-azure-registry-provider#semantic-versioning) for details

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
