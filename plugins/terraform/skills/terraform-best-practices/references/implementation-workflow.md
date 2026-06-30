# Implementation Workflow

Use this workflow after module discovery and before final validation.

## Determine the Target Folder

Read `apps/website/docs/terraform/infra-folder-structure.md` from the DX knowledge base and inspect the repository structure.

Typical placements:

- ongoing environment resources: `infra/resources/<env>/<region>/` or the existing environment layout
- shared local resource modules: `infra/resources/_modules/<service-name>/`
- reusable registry modules: `infra/modules/<module-name>/`
- bootstrapping resources: `infra/bootstrapper/<env>/`

Only ask the user which folder to use when the DX docs and existing repository structure do not make the location clear.

## Summarize Before Editing

Before writing or editing Terraform, briefly present:

1. **Current state**: the existing infrastructure relevant to the request.
2. **Planned changes**: what will be added, modified, or removed.
3. **Standards alignment**: how the plan relates to DX modules, folder structure, and the Technology Radar.

Keep the summary focused on affected resources and direct dependencies. Do not produce a full infrastructure inventory.

When the plan diverges from a standard DX pattern, explain the exception and the reason before editing.

## Infer Values Before Asking

Inspect existing `.tf` files in the target area to infer:

- `prefix`
- `env_short`
- `location`
- `domain`
- `app_name`
- `instance_number`
- resource group references
- subscription references
- existing tags such as `BusinessUnit`, `ManagementTeam`, and `CostCenter`
- existing core-values-exporter module outputs for shared values such as VNet IDs, VNet resource groups, private endpoint subnet IDs, and platform defaults

Prefer `module.<name>.<output>` from `pagopa-dx/<csp>-core-values-exporter/<provider>` over new `data` sources when shared values are already exported.

Never invent project-specific default values. If a required value is not present in the repository, docs, module source, examples, or user request, ask the user.

## Choose Inline Resources vs Local Module

Use a local module under `infra/resources/_modules/<service-name>/` when:

- creating two or more related resources for one logical service
- the service will likely be reused across environments
- the implementation is expected to grow over time

Use inline resources when:

- adding one standalone resource
- patching an existing flat pattern
- the surrounding target area already uses a flat convention for the same kind of change

If a local module is warranted, create:

- `main.tf` for DX registry module calls and raw resources not covered by DX modules
- `variables.tf` for all local module inputs with descriptions and validation blocks where constraints are known
- `iam.tf` for DX role-assignment modules and any raw role assignment resources
- `outputs.tf` for IDs, names, and endpoints needed by callers

Instantiate local modules from the environment folder, preferably in a dedicated `<service>.tf`, and pass values from `locals.tf`. Do not create `variables.tf` in root environment folders.

If a local module is recommended but not strictly required, ask the user whether they want that structure:

```text
Should these resources be organized as a local module in `_modules/`? This is recommended when the service will grow or be reused across environments.
```

## Secret Handling

Never put secret values in Terraform code, variables, locals, outputs, `.tfvars`, app settings, or container environment variables.

Use these patterns:

- `azure-keyvault-secret` for `azurerm_key_vault_secret` resources with write-only `value_wo`.
- `azure-keyvault-reference` for App Service, Function App, and Container Apps secret references.
- versionless Key Vault references by default.
- least-privilege secret-reader access for the runtime identity.

If a secret value would be required and no secure pattern is available, stop and ask the user to manage the secret outside Terraform or enable the required Azure skill.

## Auto-Wire Required Capabilities

When a higher-level feature requires supporting infrastructure, add it automatically instead of leaving it to the user:

- role assignments when an identity needs data-plane or secret access
- managed identity when a service reads protected resources
- private endpoints and private DNS wiring for private service patterns
- write-only secret resources when Terraform must create Key Vault secret metadata
- required DX tags
- explicit dependencies where Terraform ordering would otherwise be ambiguous
- `dx_available_subnet_cidr` for every new subnet

Mention auto-wired capabilities in the final summary.

## Comment Policy

Write complete Terraform. Never leave comments that merely instruct the user what to add later.

For every non-obvious user-choosable parameter, add a short inline comment just above the value explaining:

1. what the parameter controls
2. what changes if the value changes

Avoid comments for obvious parameters.

Wrong:

```hcl
# Changes the Node.js runtime version the web app executes with.
node_version = 22
```

Right:

```hcl
# Choose "development" for cost-effective, flexible environments. This disables performance optimizations but may have higher latency.
# For predictable performance in production, choose "default" instead, which enables performance optimizations.
use_case = "development"
```

## Technology Radar Handling

Before introducing a new service or technology:

1. Check the `technology-radar` skill or `https://dx.pagopa.it/radar.json`.
2. Prefer `adopt` technologies.
3. Use `trial` technologies with a short explanation.
4. Avoid `assess` unless the user explicitly asks for it.
5. Do not use `hold` technologies unless the user confirms after a warning.

For confirmed `hold` usage, add a nearby Terraform comment:

```hcl
# radar: hold - consider migrating to <alternative>
```

## Validation

Validate in the target Terraform directory:

1. Run `terraform init`, or `terraform init -backend=false` if backend configuration is unavailable.
2. Run `terraform validate` and fix all errors.
3. Run `terraform plan` only when credentials and backend access are already available. Investigate and fix errors reported by the plan.
4. Run the smallest existing validation that covers the changed files. For pre-commit, prefer `pre-commit run --files <changed .tf files>` over `pre-commit run -a` unless broad validation is intentional.

For common errors and fixes, see [Terraform Troubleshooting](./troubleshooting.md).

Iterate until `terraform validate` and, when applicable, `terraform plan` pass. Do not present Terraform as complete while validation fails.

## Final Review

Refactor until the [Terraform Best Practices Checklist](./checklist.md) is satisfied.

In the final report, include explanations for any checklist item that is not fully met and the concrete next step needed to address it.
