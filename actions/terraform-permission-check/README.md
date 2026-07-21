# Terraform Permission Check Action

Checks a sanitized Terraform plan against the Infra CD apply identity before
merge. The action sends the redacted plan and the DX
`terraform-permission-check` skill to the private Microsoft Foundry gateway and
writes the returned markdown verdict to a file that can be posted on the PR.

The check is read-only and non-mutating. It uses the Azure SDK with the CI OIDC
identity to retrieve the CD identity, its deployed role assignments, and role
definitions. If Azure reads are unavailable, the prompt instructs the model to
use the Terraform-derived fallback described by the DX skill.

## Usage

```yaml
- name: Terraform Permission Check
  id: permission-check
  uses: pagopa/dx/actions/terraform-permission-check@main
  continue-on-error: true
  with:
    filtered-plan-path: ${{ steps.plan.outputs.filtered_plan_path }}
    gateway-url: https://internal-apim.example/ai/v1/responses
    model-deployment-name: gpt-5-5
    working-directory: infra/resources/dev
```

## Inputs

| Input                             | Description                                                                                  | Required | Default                         |
| --------------------------------- | -------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| `filtered-plan-path`              | Sanitized Terraform plan from `sanitize-terraform-plan`.                                     | Yes      | -                               |
| `gateway-url`                     | Private APIM Responses API URL.                                                              | Yes      | -                               |
| `model-deployment-name`           | Foundry model deployment name.                                                               | Yes      | -                               |
| `working-directory`               | Terraform working directory used for labels and output placement.                            | No       | `.`                             |
| `cd-identity-name`                | Optional Infra CD identity name when already resolved by the caller.                         | No       | `""`                            |
| `cd-identity-resource-group-name` | Optional resource group containing the CD identity. Defaults to the DX naming convention.    | No       | `""`                            |
| `azure-subscription-id`           | Optional subscription ID for live Azure SDK RBAC context. Defaults to `ARM_SUBSCRIPTION_ID`. | No       | `""`                            |
| `gateway-token-scope`             | OAuth scope used to acquire the gateway bearer token.                                        | No       | `https://ai.azure.com/.default` |
| `skill-path`                      | Optional path to override the bundled DX skill.                                              | No       | bundled plugin skill            |
| `output-file`                     | Markdown report path, relative to `working-directory` when not absolute.                     | No       | `terraform-permission-check.md` |

## Outputs

| Output                 | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `markdown-report`      | Markdown verdict returned by the Foundry gateway. |
| `markdown-report-file` | Path to the generated markdown report file.       |

## Requirements

- The job must already be authenticated to Azure CLI, typically through the DX
  `csp-login` action and OIDC.
- The runner must reach the private APIM gateway.
- The CI identity needs Azure Reader-equivalent access to read the CD UAMI,
  role assignments, and role definitions in the target subscription.

The reusable [infra_plan.yaml](../../.github/workflows/infra_plan.yaml)
workflow includes an opt-in integration that runs this action and posts the
report with `pr-comment`.
