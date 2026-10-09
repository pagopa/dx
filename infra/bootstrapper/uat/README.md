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

## CI setup

Terraform jobs install only the tools needed for validation and cloud login in
an isolated Mise data directory. Python and `uv` are installed before the locked
Azure CLI graph is resolved. Mise runtime selection retains the seven-day
minimum release age, independently of the tool versions and release-age policy
in the repository configuration.
The job token is available before Mise setup so runtime self-updates use
authenticated GitHub requests.

Terraform jobs do not restore or save tool, dependency, or provider archives.
On the self-hosted runner, installing the selected toolset and root workspace
dependencies is cheaper than transferring and compressing those caches. The
No environment job retains its caches for the larger non-Terraform workload.
The small pull-request refresh marker remains cached; backend configuration,
credentials, Terraform state, and plan results are not cached.

## Measuring performance

When comparing workflow performance, use the same Terraform configuration and
refresh setting. Report runner scheduling separately from job execution, and
distinguish cache misses from warm-cache runs.

Checks and plans are separate workflow steps. Streamed Nx output exposes
initialization output and task timings without changing the plan executor's
output masking or the validation targets.
