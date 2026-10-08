# Terraform Provider Lifecycle

Emits advisory GitHub Actions warnings and job summaries for Terraform provider
versions approaching the end of DX support. AzureRM v4 support ends on
**31 December 2026**. See the
[DX tooling lifecycle](https://dx.pagopa.it/docs/tooling-lifecycle).

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

The notice is shared by `infra_plan.yaml` and both the plan and apply jobs in
`infra_apply.yaml`. Update `check-support.sh` alongside the website lifecycle
page and data when the support policy changes.

## Tests

```bash
pnpm nx test terraform-provider-lifecycle
```
