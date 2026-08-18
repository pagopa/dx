# Eval Test Prompts

Use these prompts to evaluate regressions in the Terraform plugin skills. Run each prompt in a disposable copy of the repository or a purpose-built fixture branch, then score the output with [Eval Rubric](./rubric.md).

## Prompt 1 - Prefer DX Module Over Raw Resource

```
Add a production-ready Azure Storage Account for a new payments processor in the dev environment. Follow DX Terraform conventions and infer all values you can from the existing infra. Do not ask me for values that are already present in the repository.
```

Expected behavior:

- reads only the relevant DX Terraform docs
- searches for a matching `pagopa-dx/*` storage module (`TF-G01`)
- uses the module if available instead of raw `azurerm_storage_account`
- pins the module with `~> major.minor` (`TF-G06`)
- infers `prefix`, `env_short`, `location`, `domain`, `app_name`, `instance_number`, and tags from existing Terraform
- preserves the standard `environment` object, configures the DX provider, and uses `provider::dx::resource_name()` for any supported raw resource names
- applies required tags to every taggable resource and module

## Prompt 2 - Secret Reference Safety

```
Add an app setting named DATABASE_PASSWORD to the existing Function App so it reads from Azure Key Vault. If any role assignment is needed, add it.
```

Expected behavior:

- does not put the secret value in Terraform
- uses a versionless Key Vault reference or host-native secret reference
- invokes or follows `azure-keyvault-reference`
- adds least-privilege secret-reader access for the runtime identity when missing (`TF-G02`, `TF-G03`)
- avoids broad roles such as Contributor or Key Vault Administrator

## Prompt 3 - New Subnet Allocation

```
Add a private endpoint subnet for the existing workload network. Keep it consistent with DX conventions and avoid CIDR collisions.
```

Expected behavior:

- uses `dx_available_subnet_cidr` (`TF-G05`)
- does not hardcode a new subnet CIDR
- reuses existing VNet/resource group outputs when available
- adds required private endpoint/private DNS wiring if the selected service requires it

## Prompt 4 - Radar-Gated Technology Choice

```
Add the cheapest queueing technology you recommend for a new asynchronous ingestion flow. Generate the Terraform change and explain why that technology fits.
```

Expected behavior:

- checks the Technology Radar before choosing
- prefers `adopt` or established repository patterns
- asks for confirmation before using unknown or non-recommended technologies (`TF-G09`)
- warns and blocks by default for `hold` technologies

## Prompt 5 - Local Module Decision

```
Create Terraform for a new service that needs a Container App, its managed identity, a storage account, and Key Vault-backed environment variables. Put it in the right place in infra.
```

Expected behavior:

- proposes or creates a local module because multiple related resources form one logical service
- keeps root environment configuration in `locals.tf` (`TF-G07`)
- creates local module `main.tf`, `variables.tf`, `iam.tf`, and `outputs.tf`
- uses DX registry modules where available
- auto-wires managed identity, secret references, and role assignments

## Prompt 6 - Terraform Module Diagram

```
Generate or update the Terraform module diagram for infra/modules/<module-name>. Include the main Azure/AWS resources and update the README.
```

Expected behavior:

- invokes `generate-terraform-module-diagram`
- creates or updates `diagram.mmd` and `diagram.svg`
- validates Mermaid syntax when possible
- updates `README.md` before the terraform-docs block

## Prompt 7 - Specific Instance Migration Scope

```
Migrate only the Terraform module instance named github_environment to the latest compatible version. Do not update other instances of the same module type.
```

Expected behavior:

- treats `github_environment` as a specific module instance if `module "github_environment"` exists
- updates only that instance
- checks changelog/migration notes before editing
- preserves scope even if other module instances share the same source

## Prompt 8 - Module Type Migration Scope

```
Update all usages of pagopa-dx/azure-function-app/azurerm to the latest compatible minor version.
```

Expected behavior:

- treats the request as module-type migration
- updates all and only matching module source usages
- checks changelog/migration notes
- adds moved blocks or variable migrations when required

## Prompt 9 - Explicit Use Case Decision

```
Add the DX Cosmos DB module to the dev environment. Pick the most appropriate use_case and proceed without asking unnecessary questions.
```

Expected behavior:

- derives every valid `use_case` from module source
- identifies the module default and explains production suitability and material effects
- may recommend an option but does not select it from the dev environment alone
- asks the user to choose the `use_case` explicitly
- does not ask about unrelated low-impact optional variables
