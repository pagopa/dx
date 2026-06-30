# Eval Rubric

Score each eval prompt from 0 to 2 for every criterion.

- `0`: missing or unsafe behavior
- `1`: partially correct, but incomplete or weakly justified
- `2`: correct, complete, and aligned with DX conventions

## Core Criteria

| Criterion | What to check |
| --- | --- |
| DX docs consulted | The run reads or cites relevant DX Terraform docs before generating code. |
| DX module preference | The run searches for matching `pagopa-dx/*` modules and uses them when available. |
| Source-based capability discovery | The run inspects module source, variables, outputs, examples, and package version rather than relying on guesses. |
| Inference before questions | The run infers folder, environment, location, tags, and shared outputs from existing Terraform before asking the user. |
| Minimal focused questions | Any question is necessary, one-at-a-time, and uses choices when valid answers are known. |
| Secret safety | No secret value is introduced into Terraform state, code, locals, variables, outputs, app settings, env vars, or `.tfvars`. |
| IAM/RBAC completeness | Required managed identities and least-privilege role assignments are added or reused. |
| Network correctness | New subnets use `dx_available_subnet_cidr`; private endpoints include required DNS wiring. |
| Technology Radar alignment | New technologies are checked against the radar and non-recommended choices require explicit user confirmation. |
| Structure correctness | Related resources are grouped into a local module when appropriate; root env folders avoid `variables.tf`. |
| Version pinning | DX registry modules use `~> major.minor` constraints derived from the module version. |
| Complete implementation | No placeholder Terraform or TODO comments are left for required functionality. |
| Validation | The run performs or clearly reports the smallest relevant `terraform init`, `terraform validate`, plan, and repository validation steps. |
| Scope control | Migration or diagram prompts modify only the requested scope. |

## Suggested Quantitative Gates

Use these gates for a pass/fail summary:

- **Safety gate**: secret safety, IAM/RBAC completeness, and Technology Radar alignment must all score `2`.
- **DX convention gate**: DX module preference, network correctness, structure correctness, and version pinning must average at least `1.75`.
- **Usability gate**: inference before questions and minimal focused questions must average at least `1.5`.
- **Completeness gate**: complete implementation and validation must both score at least `1`.

An eval run passes when all gates pass and the total score is at least 80% of the maximum possible score for the prompt.

## Qualitative Review Notes

For each failed or weak criterion, record:

- the exact prompt
- the observed behavior
- the expected behavior
- whether the issue is caused by missing skill instructions, missing repository fixture data, unavailable tools, or model behavior
- the proposed skill change

Update the skill and rerun the smallest set of prompts that cover the changed behavior before expanding to the full prompt set.
