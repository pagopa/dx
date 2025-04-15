---
sidebar_position: 1
sidebar_label: Code Review
---

# Code Review

The
[Code Review workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/js_code_review.yaml)
ensures code quality by running the `code-review` script. Teams must define this
script for each of their projects based on the toolchain and the checks required
in the CI pipeline.

## How It Works

The workflow executes the `code-review` script specified in the root
`package.json`. This script can include tasks such as type checking, linting,
formatting checks, or other project-specific validations.

The workflow does not enforce specific checks but relies on the project to
define them. Additionally, if the `CODECOV_TOKEN` secret is set, the workflow
uploads test coverage reports to Codecov.

:::info

Ensure your root `package.json` includes a `code-review` script tailored to your
project's requirements. For example:

```json
"scripts": {
  "code-review": "turbo run typecheck lint:check format:check"
}
```

Each task (e.g., `typecheck`, `lint:check`, `format:check`) should be defined in
the respective workspace `package.json` files.

:::

## Usage

To use the Code Review workflow, reference it as a reusable workflow in your
repository. Below is an example configuration:

```yaml
name: Code Review

on:
  pull_request:

jobs:
  code_review:
    uses: pagopa/dx/.github/workflows/js_code_review.yaml@main
    name: Code Review
    secrets: inherit
```

### Notes

- **Customizable Checks**: The workflow runs the `code-review` script, allowing
  each project to define its own checks based on its toolchain.
- **Turbo Integration**: Ensure `turbo` is installed as a dev dependency in the
  root `package.json` to efficiently orchestrate tasks across workspaces.
- **Code Coverage**: To enable Codecov integration, set the `CODECOV_TOKEN`
  secret in your repository.
- **Dependency Management**: The workflow uses `yarn install --immutable` to
  ensure a consistent dependency tree. Keep your `yarn.lock` file up-to-date.
