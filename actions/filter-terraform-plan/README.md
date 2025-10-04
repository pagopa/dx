# Filter Terraform Plan Action

## Purpose

This GitHub Action runs `terraform plan`, removes sensitive values from the
output, and strips non-essential log lines so the resulting plan is safe to post
on PRs or optionally upload as an artifact. It's intended for CI workflows that
need a readable, sanitized plan to help reviewers understand infrastructure
changes without leaking secrets.

## How it works

- Accepts a working directory and a comma-separated list of sensitive keys.
- Optionally disables state refresh to speed up repeated runs.
- Runs `terraform plan` and pipes the output through a filter that replaces
  values for configured sensitive keys and generic standard patterns with a
  placeholder and removes noisy lines (state refresh/reads).
- Reduces the plan to the `resource-diff` section when possible and extracts a
  summary line with counts of `adds`/`changes`/`destroys`.
- Exposes the path to the filtered plan and a short summary as action outputs so
  the calling workflow can post it to a PR or store it as an artifact.
- Exit semantics: the step fails on Terraform runtime errors (exit code 1). It
  succeeds for both "no changes" (0) and "changes detected" (2), so a plan that
  detects changes won't incorrectly fail the workflow.

## Inputs

- `base-path` (optional, default: `.`)
  - Path where `terraform plan` will be executed. Use a repo-relative path to
    the Terraform module or environment folder.

- `no-refresh` (optional, default: `false`)
  - When `true`, runs `terraform plan` with `-refresh=false -lock=false` to
    avoid refreshing remote state (useful for fast, repeated PR checks).

- `sensitive-keys` (required)
  - Comma-separated keys whose values will be replaced in the plan output (for
    example: `hidden-link,APPINSIGHTS_INSTRUMENTATIONKEY`). Keys are matched
    case-insensitively and quoted/unquoted forms are handled.

- `upload-artifact` (optional, default: `false`)
  - When `true`, uploads the filtered plan as a workflow artifact for later
    inspection.

## Outputs

- `summary_line`
  - A single-line summary reporting how many resources will be
    added/changed/destroyed (extracted from the filtered plan). Useful when the
    full plan is too large to post directly.

- `filtered_plan_path`
  - The filesystem path to the sanitized/filtered plan file produced by the
    action (for example: `${{ inputs.base-path }}/filtered_plan.txt`).

## Practical example

Below is a minimal example showing how the action is used from a reusable
workflow or a job step. The `infra_plan.yaml` workflow in this repo demonstrates
a full integration; this snippet shows the essential call:

```yaml
- name: Terraform Plan
  id: plan
  uses: pagopa/dx/actions/filter-terraform-plan@main
  with:
    base-path: infra/resources/prod
    sensitive-keys: hidden-link,APPINSIGHTS_INSTRUMENTATIONKEY
    no-refresh: false
    upload-artifact: false
```

After the step runs you can read the outputs:

- `${{ steps.plan.outputs.summary_line }}` — short summary of the plan
- `${{ steps.plan.outputs.filtered_plan_path }}` — path to the sanitized plan
  file

A calling workflow can then post the plan to the PR, save it as an artifact, or
fail the run depending on its policies.

## Recommendations and notes

- Provide a conservative list of `sensitive-keys` for any values you do not want
  exposed in logs or PR comments.
- For fast PR checks, enable `no-refresh` to avoid refreshing state frequently;
  be aware this can hide drift between remote state and configuration.
- If the plan output is very large, prefer posting only the `summary_line` and
  attach the full sanitized plan as an artifact.

For implementation details and exact behavior refer to
[dx/.github/actions/filter-terraform-plan/action.yaml](https://github.com/pagopa/dx/blob/main/actions/filter-terraform-plan/action.yaml),
or the
[infra_plan.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_plan.yaml)
in this repository.
