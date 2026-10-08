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

When comparing workflow performance, use the same Terraform configuration and
refresh setting. Report runner scheduling separately from job execution, and
distinguish cache misses from warm-cache runs.
