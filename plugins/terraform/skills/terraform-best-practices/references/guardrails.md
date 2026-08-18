# Terraform Guardrails

These rules are normative. Apply every guardrail that matches the requested change and report any exception before editing.

| ID | Trigger | Required behavior | User confirmation |
| --- | --- | --- | --- |
| `TF-G01` | A DX Registry module covers the requested capability | Use the `pagopa-dx/*` module instead of raw provider resources. | Only when the request requires an unsupported capability or intentional deviation. |
| `TF-G02` | Terraform handles sensitive configuration | Never place secret values in code, variables, locals, outputs, `.tfvars`, app settings, environment variables, or Terraform state. Use the provider-specific secret skill, versionless runtime references by default, and write-only secret resources when Terraform must create secret metadata. Stop when no state-safe pattern is available. | Required before using an external process or unsupported pattern. |
| `TF-G03` | A selected feature requires supporting infrastructure | Add the required managed identity, least-privilege role assignments or IAM, private endpoints, private DNS, diagnostics, and explicit `depends_on` when Terraform cannot infer ordering. | Not required for support implied by an already confirmed feature. |
| `TF-G04` | A resource needs a name | Ensure the relevant `pagopa-dx/azure` or `pagopa-dx/aws` provider is configured. Use `provider::dx::resource_name()` for every supported resource name. Build or reuse its naming configuration from `prefix`, `env_short`, `location`, `domain`, `app_name`, and `instance_number`. | Required only when a base naming value cannot be inferred. |
| `TF-G05` | A new subnet is required | Use `dx_available_subnet_cidr`; never calculate or hardcode a new subnet CIDR. | No. |
| `TF-G06` | A DX Registry module is added or upgraded | Derive its current version from the module `package.json` and pin it with `~> major.minor`. | Required only for a major-version migration or intentional older version. |
| `TF-G07` | Terraform is placed in an environment root or local module | Keep environment configuration in root `locals.tf`; never add root `variables.tf`. Group resources by logical service in `_modules/` when the service owns multiple related resources or is reused. | Required only when more than one structure is equally consistent with the repository. |
| `TF-G08` | Resources or modules accept tags | Reuse the target environment's required tags and apply them to every taggable resource and module. Do not invent ownership or cost-allocation values. | Required when required tag values cannot be inferred. |
| `TF-G09` | The change introduces a new service or technology choice | Check the Technology Radar. Prefer `adopt`; explain `trial`; require confirmation for `assess` and `hold`. Add a `# radar: hold` comment for confirmed `hold` usage. | Required for `assess`, `hold`, or an unavailable Radar result. |
| `TF-G10` | Terraform is generated or modified | Produce complete code without placeholder comments or deferred required wiring. | No. |
| `TF-G11` | The implementation is complete | Run `terraform init` or `terraform init -backend=false`, `terraform validate`, applicable `terraform plan`, and the smallest repository validation covering the change. Investigate and fix actionable errors; never report the implementation as complete while an applicable check fails. | No; report unavailable credentials or backend access. |

## Review

Before finishing:

1. Identify the applicable guardrail IDs.
2. Verify each one against the generated diff and validation output.
3. Report exceptions by ID, with the reason and concrete follow-up.
