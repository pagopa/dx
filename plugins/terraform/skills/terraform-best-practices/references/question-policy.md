# Question Policy

Use this policy whenever Terraform generation needs input from the user.

## Infer Before Asking

Ask the user only for values that could not be inferred from:

- DX Terraform documentation
- the target Terraform files
- existing environment locals
- existing tags
- DX module README, source, variables, outputs, validations, and examples
- existing shared outputs such as core-values-exporter module outputs for VNet IDs, VNet resource groups, private endpoint subnet IDs, and platform defaults

Common values to infer before asking:

- `prefix`
- `env_short`
- `location`
- `domain`
- `app_name`
- `instance_number`
- resource group references
- subscription references
- `BusinessUnit`
- `ManagementTeam`
- `CostCenter`
- backend state configuration

## Ask One Question at a Time

Never bundle multiple unknowns into one prompt. Ask each unresolved value or decision separately.

Wrong:

```text
Please provide prefix, domain, app_name, and instance_number separated by commas.
```

Right:

```text
What is the `prefix` for this project?
```

Then, after the user answers:

```text
What is the `domain`?
```

This reduces input errors and makes the workflow resumable.

## Offer Choices When Known

When the valid values are known, present choices instead of asking for free-form text.

Useful choice sets:

| Field            | Choices                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `env_short`      | `p` for prod, `d` for dev, `u` for uat                                                                                                                                                                                         |
| `location`       | `italynorth`, `westeurope`, `spaincentral`, or values already used in the target repository                                                                                                                                    |
| `BusinessUnit`   | Values already used in the repository; otherwise `App IO`, `CGN`, `Carta della Cultura`, `IT Wallet`, `DevEx`, or a free-form fallback                                                                                         |
| `ManagementTeam` | Values already used in the repository; otherwise `IO Platform`, `IO Wallet`, `IO Comunicazione`, `IO Enti & Servizi`, `IO Autenticazione`, `IO Bonus & Pagamenti`, `IO Firma`, `Developer Experience`, or a free-form fallback |

Use free-form only for values with no fixed set, such as `prefix`, `domain`, and `app_name`.

## Module `use_case` Questions

For module `use_case` values, always derive valid options from the module documentation and source. Present a concise table before asking.

Example:

| use_case      | Description                                              | Production fit |
| ------------- | -------------------------------------------------------- | -------------- |
| `development` | Cost-efficient configuration for development or testing. | No             |
| `default`     | Production-oriented defaults for predictable behavior.   | Yes            |

Ask:

```text
Which `use_case` best fits this environment?
```

Do not invent `use_case` values.

## Never Assume Default Values

Do not silently choose project-specific defaults. If configuration is not found in the workspace and is not determined by DX conventions, ask the user.

This applies especially to:

- environment naming fields
- required tags
- backend state configuration
- production-impacting `use_case`, SKU, sizing, retention, redundancy, and exposure choices

## Dynamic Capability Questions

Derive optional capability questions from the module capability map built from `variables.tf`, validation blocks, examples, and implementation files.

For each optional capability:

1. Explain what it does in plain language.
2. Explain the default behavior if left unconfigured.
3. Explain what changes if the user enables, disables, or changes it.
4. Mention security, cost, scale, resilience, and operations impact when relevant.
5. Ask whether the user needs it.
6. If enabled, ask follow-up questions only for required sub-fields.

Capabilities that often require this treatment:

- public vs private exposure
- custom domains
- Entra ID authentication
- Key Vault secret references
- autoscaling
- sizing and SKU choices
- diagnostics and retention
- private endpoints
- replicas or geo-redundancy

## Do Not Ask About Convention-Decided Details

Do not ask the user to decide details already determined by DX conventions unless there is a genuine trade-off.

Apply the convention directly for:

- `provider::dx::resource_name()` naming
- `dx_available_subnet_cidr` for new subnets
- `~> major.minor` module version constraints
- required tags inferred from the target environment
- least-privilege secret-reader role assignment when an app must read Key Vault secrets
- local module layout when the service clearly has multiple related resources

Mention these automatic choices in the summary so the user understands what was added.
