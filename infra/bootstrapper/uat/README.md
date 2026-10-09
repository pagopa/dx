# UAT bootstrapper validation

The Code Review workflow validates this Terraform application on a self-hosted
runner labelled `uat`, using the `bootstrapper-uat-ci` GitHub environment.
Changes in this directory select the UAT job through Nx affected-project
detection.

The job runs formatting, linting, available tests, and Trivy before initializing
the backend and generating a Terraform plan. It never applies the plan.

```sh
pnpm nx run-many -p bootstrapper-uat -t fmt,lint,test,trivy -c ci
pnpm nx run bootstrapper-uat:plan -c ci
```

CI initialization verifies the committed provider and module locks. Plan refresh
is enabled unless the workflow finds a refresh marker for the same pull request
and environment in the current ten-minute window.

## CI caches

Terraform jobs install only the tools needed for validation and cloud login in
an isolated Mise data directory. Python and `uv` are installed before the locked
Azure CLI graph is resolved. The first environment matrix job saves the complete
tool cache; the other environment jobs only restore it. Mise runtime selection
retains the seven-day minimum release age, independently of the tool versions
and release-age policy in the repository configuration.
The job token is available before Mise setup so runtime self-updates use
authenticated GitHub requests.

The No environment job writes the shared pnpm and TFLint caches. Terraform jobs
restore them without attempting duplicate saves.

Provider caches contain only each root's `.terraform/providers` directory.
Their keys include the environment, runner OS and architecture, Terraform
version files, and provider lockfiles. Backend configuration, credentials,
Terraform state, and plan results are not cached. Each root has a separate
provider installation directory, preserving parallel initialization.

## Measuring performance

When comparing workflow performance, use the same Terraform configuration and
refresh setting. Report runner scheduling separately from job execution, and
distinguish cache misses from warm-cache runs.

Checks and plans are separate workflow steps. Static Nx output exposes
initialization output and task timings without changing the plan executor's
output masking or the validation targets.
