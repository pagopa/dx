# Source Routing

Read only the sources relevant to the requested change. Resolve the knowledge-base root from `DX_KB_PATH`, the current `pagopa/dx` checkout, or `~/.dx`.

Use the bundled [Terraform Guardrails](./guardrails.md) and [Implementation Workflow](./implementation-workflow.md) as the authoritative source for architecture constraints and exceptions. Use the knowledge base for repository conventions and service contracts.

| Concern | Authoritative source |
| --- | --- |
| Infrastructure placement | `apps/website/docs/terraform/infra-folder-structure.md` |
| Root and local module organization | `apps/website/docs/terraform/code-style.md` |
| Required tags | `apps/website/docs/terraform/required-tags.md` |
| Registry module usage and locking | `apps/website/docs/terraform/using-terraform-registry-modules.md` |
| Naming and subnet allocation | `apps/website/docs/azure/using-azure-registry-provider.md` or the corresponding AWS provider documentation |
| Validation and pre-commit | `apps/website/docs/terraform/static-analysis.md` and `pre-commit-terraform.md` |
| Service-specific behavior | The matching DX module's `README.md`, variables, validations, implementation, outputs, examples, and `package.json` |
| New technology choice | The Technology Radar |

Start with the narrowest source that can resolve the question. Expand to module implementation files or examples only when summaries, variable definitions, and validations do not establish the behavior.
