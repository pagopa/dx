# Terraform Provider Lifecycle

Emits advisory GitHub Actions warnings and job summaries for Terraform provider
versions approaching the end of DX support. AzureRM v4 support ends on
**31 December 2026**. See the
[DX tooling lifecycle](https://dx.pagopa.it/docs/tooling-lifecycle).

The deadline applies to earlier v4-compatible module releases. New v5-only
module majors require AzureRM `>= 5.8.0, < 6.0.0`; they do not make v4 invalid
for older releases before the deadline. The notice links to the
[migration guide](https://github.com/pagopa/dx/blob/main/infra/modules/AZURERM_V5_MIGRATION.md)
and remains advisory. It does not infer which module major a project uses or
certify upgrade safety.

## Usage

Run after `terraform init`, in the same Terraform project directory. Terraform,
`jq`, and Bash must be available on the runner.

```yaml
- name: Check Terraform provider support
  continue-on-error: true
  uses: pagopa/dx/actions/terraform-provider-lifecycle@main
  with:
    working-directory: infra/resources/dev
```

The action reads `terraform version -json` to identify the selected
`registry.terraform.io/hashicorp/azurerm` version, including when it is required
by a child module. It does not modify provider constraints or the lock file.
Only v4 produces the deprecation notice; other versions and projects without
AzureRM are unaffected.

If the selected version cannot be read, the action emits a diagnostic warning.
Keep `continue-on-error: true` on the calling step so an unexpected check failure
cannot block an otherwise valid plan or apply.

The action exposes the Markdown notice through its `notice` output.
`infra_plan.yaml` sets `write-summary: "false"` and posts that notice as a PR
comment, identified by the project directory so subsequent runs update the
corresponding comment. `infra_apply.yaml` writes the notice to the job summary
during its plan phase only; its apply phase does not run this action.

Update `check-support.sh` alongside the website lifecycle data when the support
policy changes.

## Tests

```bash
pnpm nx test terraform-provider-lifecycle
```
