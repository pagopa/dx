# Eval Rubric

Score each applicable criterion from 0 to 2:

- `0`: missing, unsafe, or contrary behavior
- `1`: partially correct or weakly justified
- `2`: complete and aligned with the skill contract
- `N/A`: the prompt does not exercise the criterion

Exclude `N/A` criteria from averages and the maximum possible score.

## Criteria

| Criterion | Guardrail | Applies when | What to check |
| --- | --- | --- | --- |
| Targeted source use | - | Every Terraform generation prompt | The run reads the narrowest relevant DX documentation and expands only when needed. |
| DX module preference | `TF-G01` | A module may cover the requested capability | The run discovers and uses the module for supported behavior. |
| Staged capability discovery | `TF-G01` | A candidate module exists | The run inspects existing calls, required and optional inputs, relevant nested fields, defaults, validations, outputs, and package version before expanding to implementation or examples. |
| Evidence-backed inference | - | Repository values may already exist | Factual values are inferred from named files or module instances rather than guessed. |
| Material decision ownership | - | Security, cost, exposure, scale, resilience, retention, or operations can change | Source-derived options and effects are presented for explicit user choice. |
| Explicit `use_case` choice | - | A module exposes `use_case` and the user did not specify it | The run does not infer from the environment or silently accept the default. |
| Focused questions | - | User input is required | Questions cover one trade-off at a time and avoid unrelated optional capabilities. |
| Secret safety | `TF-G02` | Sensitive configuration is involved | No secret value enters Terraform or state; versionless references and write-only resources are used when supported. |
| Supporting IAM and network | `TF-G03` | The selected feature requires supporting infrastructure | Required identities, least-privilege permissions, endpoints, and DNS are added or reused. |
| Resource naming and environment contract | `TF-G04` | Resource names are introduced | The DX provider is configured and base environment fields are mapped to `provider::dx::resource_name()`. |
| Subnet allocation | `TF-G05` | New subnets are introduced | `dx_available_subnet_cidr` is used and no CIDR is calculated or hardcoded. |
| Version pinning | `TF-G06` | A DX Registry module is added or upgraded | `~> major.minor` is derived from the module `package.json`. |
| Structure correctness | `TF-G07` | New resources or composition are introduced | Root configuration uses locals and service-owned resources are grouped appropriately. |
| Required tags | `TF-G08` | Taggable resources or modules are introduced | Existing required tags are inferred and applied consistently to every taggable resource and module. |
| Technology Radar alignment | `TF-G09` | A new service or technology is selected | Non-recommended or unavailable Radar results require confirmation. |
| Complete implementation | `TF-G10` | Terraform is generated | Required code and supporting resources contain no placeholders. |
| Validation | `TF-G11` | Terraform is modified | The smallest applicable init, validate, plan, and repository checks run or are reported unavailable. |
| Scope control | - | Migration or diagram prompts | Only the requested module instance, module type, or diagram scope changes. |

## Gates

- **Safety:** every applicable secret, IAM/network, and Radar criterion scores `2`.
- **DX conventions:** applicable `TF-G01`, `TF-G04`, `TF-G05`, `TF-G06`, `TF-G07`, and `TF-G08` criteria average at least `1.75`.
- **Decision UX:** applicable inference, material-decision, `use_case`, and focused-question criteria average at least `1.75`.
- **Completeness:** complete implementation and validation each score at least `1` when applicable.

A run passes when every applicable gate passes and the total score is at least 80% of the applicable maximum.

## Review Notes

For each weak or failed criterion, record:

- prompt and fixture
- observed and expected behavior
- applicable guardrail ID
- whether the cause is skill guidance, fixture data, unavailable tools, or model behavior
- smallest proposed change and regression prompts to rerun
