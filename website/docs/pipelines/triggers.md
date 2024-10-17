---
sidebar_position: 1
sidebar_label: Pipeline Triggers
---

# The role of triggers in pipelines

Triggers in a CI/CD pipeline are more than just automated switches; they embody
the principles of flow and harmony within software development. By defining when
and how processes like building, testing, or deploying should happen, triggers
shape the rhythm of the pipeline. If set with precision, they ensure that every
change is seamlessly integrated, tested, and delivered, maintaining the
integrity of the repository. However, if misconfigured, they can lead to
inconsistencies, breaking the cadence of development and introducing chaos into
what should be a continuous, smooth evolution. In essence, triggers dictate the
pipeline's scope, serving as the silent guardians of coherence and reliability.

This document provides a guide on how triggers should be set when using the
GitHub Actions template provided by this repository.

:::note

Every pipeline should have the `workflow_dispatch` trigger. In this way we will
always be able to launch it from the UI, which may be necessary in moments when
it is necessary to exit the ordinary flow (i.e. incidents).

```yaml
on:
  workflow_dispatch:
```

:::

## Continuous Integration on GitHub Actions

Continuous integration refers to the build, validation and testing of the
software. Generally, these tasks should be launched when a Pull Request is
opened against the main branch, to ensure that high code quality is maintained.

Then, a pipeline in charge of validate code (unit test, linter, Terraform Plans,
etc.) should run when:

- a PR is opened
- a commit is added to an already opened PR
- a previously closed PR is reopened
- a draft PR is marked as ready for review

To achieve these settings, use the following:

```yaml
on:
  pull_request:
    types:
      - opened # Trigger on new PRs
      - synchronize # Trigger when commits are added to an open PR
      - reopened # Trigger when a closed PR is reopened
      - ready_for_review # Trigger when a draft PR is marked as ready
```

At the end, add the trigger paths which would make sense to you. These generally
are:

- Terraform:
  - the path to the specific Terraform configuration, including both environment
    (i.e. `prod`) and modules (`_modules`) folders
- the GitHub workflow file you are working on, including also the CD file
- apps:
  - the workspace of a given application

Here's an example of a good setup for Terraform CI workflows:

```yaml
on:
  pull_request:
    types:
      - ...
    paths:
      - "infra/resources/prod/**"
      - "infra/resources/_modules/**"
      - ".github/workflows/core_code_review.yaml"
      - ".github/workflows/core_deploy.yaml"
```

## Continuous Delivery on GitHub Actions

Continuous Delivery focuses on ensuring software is always release-ready with
manual approval. Generally, these pipelines run when a Pull Request is merged in
the main branch.

:::note

Continuous Delivery and Continuous Deployment are not the same thing: continuous
deployment automates the release process, deploying changes to production once
tests pass. No manual approval is required.

We stick to Continuous Delivery.

:::

Then, a pipeline in charge of deploying code (zip deployment, Docker images
pushing, Terraform Apply, etc.) should run when:

- a PR is merged

The only necessary trigger is:

```yaml
on:
  push:
    branches:
      - main
```

:::note

Replace `main` with `master` if needed for your repository

:::

At the end, add the trigger paths which would make sense to you. These generally
are:

- Terraform:
  - the path to the specific Terraform configuration, including both environment
    (i.e. `prod`) and modules (`_modules`) folders
- the CD GitHub workflow file you are working on
- apps:
  - the workspace of a given application

Here's an example of a good setup for Terraform CD workflows:

```yaml
on:
  pull_request:
    types:
      - ...
    paths:
      - "infra/resources/prod/**"
      - "infra/resources/_modules/**"
      - ".github/workflows/core_deploy.yaml"
```

While the pipeline job starts through trigger automation, setting up your GitHub
repository to require a manual approval for the actual deployment is
**strongly** adviced.
