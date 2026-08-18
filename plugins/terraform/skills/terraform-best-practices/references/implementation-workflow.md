# Implementation Workflow

Use this workflow after staged module discovery.

## Resolve Scope and Placement

Read the relevant sources from [Source Routing](./source-routing.md), then inspect the target Terraform area.

Determine placement from the request, DX folder guidance, and existing repository structure:

- environment composition belongs in the existing environment root
- shared service implementations belong under `infra/resources/_modules/<service>/`
- reusable published modules belong under `infra/modules/<module>/`
- bootstrapping resources belong under the repository's bootstrapper layout

Ask about placement only when more than one location is equally valid.

## Resolve the Base Environment Contract

Before asking for naming values, inspect the target environment and equivalent module calls for:

- `prefix`
- `env_short`
- `location`
- `domain`
- `app_name`
- `instance_number`

Reuse the existing `environment` object when calling DX or local modules.

For raw resources with a supported DX resource type, build or reuse this mapping:

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
}
```

Use `local.environment` instead in an environment root where the naming configuration is defined directly in `locals.tf`.

Generate names with `provider::dx::resource_name(merge(local.naming_config, { resource_type = "<type>" }))`.

Treat missing base fields as factual inputs under the [Decision Policy](./question-policy.md). Do not derive them from the resource type or silently replace the repository's naming contract.

## Build a Decision Inventory

Before editing, separate:

1. **Repository facts**: inferred values with their source file or module instance.
2. **Convention decisions**: applicable guardrail IDs that will be applied automatically.
3. **Material decisions**: unresolved choices requiring the [Decision Policy](./question-policy.md).

Briefly summarize the current affected infrastructure, planned changes, automatic supporting infrastructure, and any deviation from a guardrail.

## Choose Inline or Local Module

Use a local module when the implementation:

- owns multiple related resources for one logical service
- centralizes that service's IAM and network dependencies
- is reused across environments
- is expected to grow as one capability

Use the existing flat structure when adding one standalone resource or making a narrow change to an established flat pattern.

Ask only when both structures are equally consistent. Do not ask merely because a local module is technically possible.

A new local module normally contains:

- `main.tf` for module calls and uncovered raw resources
- `variables.tf` for documented inputs and known validations
- `iam.tf` for service-owned permissions
- `outputs.tf` for IDs, names, endpoints, and other values required by callers

Instantiate it from the environment composition layer, preferably in a dedicated `<service>.tf` when that matches the repository layout, and pass configuration from `locals.tf`. Never create root environment variables.

## Implement Completely

Apply every relevant [Terraform Guardrail](./guardrails.md).

Add supporting infrastructure implied by a confirmed feature, including managed identities, least-privilege role assignments or IAM, private endpoints, private DNS, diagnostics, write-only secret resources, required tags, subnet allocation, and explicit `depends_on` when Terraform cannot infer ordering.

Reuse existing core-values-exporter outputs instead of duplicating data sources.

Do not introduce optional capabilities that the user did not request or select.

Mention automatically added identities, permissions, networking, secret references, diagnostics, and other supporting infrastructure in the final summary.

## Comment Policy

Add a code comment only when future maintainers need rationale that is not evident from the Terraform expression, such as a confirmed non-standard Radar choice or an unusual operational trade-off.

Keep option comparisons and user-facing explanations in the decision conversation and final summary, not as repeated comments in generated HCL.

## Validate

Run validation in the target Terraform directory:

1. `terraform init`, or `terraform init -backend=false` when backend access is unavailable.
2. `terraform validate`, fixing every error.
3. `terraform plan` when credentials and backend access are already available, fixing actionable errors.
4. The smallest existing repository validation covering the changed files.

Do not present the implementation as complete while applicable validation fails.

## Final Review

Review every applicable guardrail ID against the diff and validation output. Report any exception by ID with its concrete next step.
