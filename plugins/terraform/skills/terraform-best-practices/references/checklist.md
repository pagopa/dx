# Terraform Best Practices Checklist

## DX Modules & Providers

- [ ] **Always use DX Registry modules (`pagopa-dx/*`)** — only use raw resources if the specific use case is not supported
- [ ] DX provider configured for resource naming (`pagopa-dx/azure` or `pagopa-dx/aws`)
- [ ] `provider::dx::resource_name()` used for all resource names
- [ ] **For every new subnet, use `dx_available_subnet_cidr` resource** to automatically allocate non-overlapping CIDR blocks
  - Required by DX standards, see `~/.dx/apps/website/docs/terraform/code-style.md`
  - Never manually calculate or hardcode new subnet CIDRs
- [ ] Module versions specified using `~>` operator with major and minor versions only (e.g., `~> 1.5`)
  - Ensures compatibility while allowing patch updates
  - See [Semantic Versioning](https://dx.pagopa.it/docs/azure/using-azure-registry-provider#semantic-versioning) for details

## Project Structure

- [ ] Target directory derived from DX documentation (`infra-folder-structure.md`) based on what the user is trying to do — only ask the user if the documentation does not clarify it
- [ ] When 2+ related resources are created for a single service, they are wrapped in a local module under `_modules/<service>/`
  - [ ] The local module is instantiated from the env folder via `locals.tf` — no `variables.tf` in root env folders
  - [ ] Outputs needed by the caller are declared in `outputs.tf`

## Configuration

- [ ] `environment` variable follows standard structure
- [ ] All resources include required tags

## Security

- [ ] Secrets use Key Vault references (`@Microsoft.KeyVault(...)`)
- [ ] No sensitive values hardcoded in Terraform code
- [ ] For any sensitive value or secret managed through Azure Key Vault, the **`azure-keyvault-secret` skill** has been followed

## Technology Radar

- [ ] All services and technologies used are `adopt` or `trial` in the [PagoPA DX Technology Radar](https://dx.pagopa.it/radar.json) — `hold` items have a `# radar: hold` comment and user acknowledgement

## Code Quality

- [ ] No placeholder comments — all configuration is fully implemented, no `# TODO`, `# add here`, or `# configure below` stubs

## Before finishing

- [ ] `terraform init` (or `terraform init -backend=false`) completed successfully
- [ ] `terraform validate` passes with no errors
- [ ] `terraform plan` reviewed (if backend and credentials are available)
- [ ] Run `pre-commit run -a` on staged files
