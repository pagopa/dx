# Filter Terraform Apply Action

## Purpose

This GitHub Action runs `terraform apply` from an existing plan file and masks
sensitive values from the output. It is intended for CI workflows that need
masked apply logs without leaking secrets.

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

The output is printed after command completion while masking the same sensitive
patterns handled by the Terraform plan filtering logic.
