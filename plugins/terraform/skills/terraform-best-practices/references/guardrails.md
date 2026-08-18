# Terraform Guardrails

These rules are normative. Apply every guardrail that matches the requested change and report any exception before editing.

| ID | Trigger | Required behavior | User confirmation |
| --- | --- | --- | --- |
| `TF-G01` | A DX Registry module may cover the requested capability | Inspect the matching `pagopa-dx/*` module contract before using raw provider resources. Keep every supported capability on the DX module. Add a narrowly scoped raw resource only for an uncovered capability, and record the evidence and gap that justify it. | Required for an intentional deviation from a matching module; not required when module source proves the capability is unsupported. |
| `TF-G02` | Terraform handles sensitive configuration | Never place secret values in code, variables, locals, outputs, `.tfvars`, app settings, environment variables, or Terraform state. A `sensitive` marker does not make state safe. Use the provider-specific secret skill, versionless provider-native runtime references by default, write-only secret operations when Terraform must provision secret metadata, and least-privilege access for the runtime identity. Stop when no state-safe pattern is available. | Required before using an external process or unsupported pattern; never silently fall back to stateful secret handling. |
| `TF-G03` | A selected feature requires supporting infrastructure | Add the required managed identity, least-privilege role assignments or IAM, private endpoints, private DNS, diagnostics, and explicit `depends_on` when Terraform cannot infer ordering. | Not required for support implied by an already confirmed feature. |
| `TF-G04` | A resource needs a name | Ensure the relevant `pagopa-dx/azure` or `pagopa-dx/aws` provider is configured. Use `provider::dx::resource_name()` for every supported resource name. Build or reuse its naming configuration from `prefix`, `env_short`, `location`, `domain`, `app_name`, and `instance_number`. | Required only when a base naming value cannot be inferred. |
| `TF-G05` | A new subnet is required | Use `dx_available_subnet_cidr`; never calculate or hardcode a new subnet CIDR. | No. |
| `TF-G06` | A DX Registry module is added or upgraded | Derive its current version from the module `package.json` and pin it with `~> major.minor`. | Required only for a major-version migration or intentional older version. |
| `TF-G07` | Terraform is placed in an environment root or local module | Treat environment roots as composition layers: keep configuration in root `locals.tf` and never add root `variables.tf`. Create a service-owned local module when one logical service owns multiple related resources, IAM or network dependencies, reusable environment-independent behavior, or is expected to grow as one capability. Keep a standalone resource inline when that matches the existing structure; do not abstract every resource. | Required only when inline and local-module layouts are equally consistent with the repository. |
| `TF-G08` | Resources or modules accept tags | Reuse the target environment's required tags and apply them to every taggable resource and module. Do not invent ownership or cost-allocation values. | Required when required tag values cannot be inferred. |
| `TF-G09` | The change introduces a new service or technology choice | Check the Technology Radar. Prefer `adopt`; explain `trial`; require confirmation for `assess` and `hold`. Add a `# radar: hold` comment for confirmed `hold` usage. | Required for `assess`, `hold`, or an unavailable Radar result. |
| `TF-G10` | Terraform is generated or modified | Produce complete code without placeholder comments or deferred required wiring. | No. |
| `TF-G11` | The implementation is complete | Run `terraform init` or `terraform init -backend=false`, `terraform validate`, applicable `terraform plan`, and the smallest repository validation covering the change. Investigate and fix actionable errors; never report the implementation as complete while an applicable check fails. | No; report unavailable credentials or backend access. |

## Review

Before finishing:

1. Identify the applicable guardrail IDs.
2. Verify each one against the generated diff and validation output.
3. Report exceptions by ID, with the reason and concrete follow-up.
