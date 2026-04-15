# Filter Terraform Apply Action

## Purpose

This GitHub Action runs `terraform apply` from an existing plan file and masks
sensitive values from the realtime output. It is intended for CI workflows that
need live apply logs without leaking secrets.

## Inputs

- `base-path` (optional, default: `.`)
  - Path where `terraform apply` will be executed.

- `plan-file` (required)
  - The plan file passed to `terraform apply`.

- `sensitive-keys` (required)
  - Comma-separated keys whose values will be masked in the apply output.

## Example

```yaml
- name: Terraform Apply
  uses: pagopa/dx/actions/filter-terraform-apply@main
  with:
    base-path: infra/resources/prod
    plan-file: tf-outcome
    sensitive-keys: hidden-link,APPINSIGHTS_INSTRUMENTATIONKEY
```

The output is streamed in realtime while masking the same sensitive patterns
handled by the Terraform plan filtering logic.

When a saved Terraform plan file is passed, `terraform apply` is already
non-interactive. Removing `-auto-approve` does not turn this action into a
safe dry run: the saved plan is still applied.
