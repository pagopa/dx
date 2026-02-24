---
sidebar_position: 50
---

# Detecting Drift in Infrastructure as Code

The
[existing Drift Detection workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_drift_detection.yml)
is a GitHub Action that identifies drifts between the Terraform code and the
current state of the resources provisioned on the target CSP.

:::note

You may find more information about the issue in this HashiCorp
[post about drift detection](https://www.hashicorp.com/en/blog/detecting-and-managing-drift-with-terraform).

:::

The workflow runs the `terraform plan` command and checks the output for any
differences between the desired state (defined in the Terraform code) and the
actual state of the infrastructure. If any differences are found, the workflow
will fail, and a notification will be sent to the configured Slack channel with
details about the detected drift.

## Usage

Navigate to your repository and create a new workflow file, and reference the DX
`infra_drift_detection.yml` job template. Below is an example of how to do it:

```yaml
name: Drift Detection

on:
  workflow_dispatch:
  schedule:
    - cron: "00 08 * * *" # Run at 08:00 every day

jobs:
  drift_detection:
    uses: pagopa/dx/.github/workflows/infra_drift_detection.yml@main
    name: Drift Detection
    secrets: inherit
    with:
      environment: "dev"
      base_path: "infra/resources/"
      override_github_environment: "infra-dev"
```

Configuration variables are as follows:

- **environment**: Specifies the environment where the resources will be
  deployed. Default value: `prod`.
- **base_path**: Defines the base path where the script will search for
  Terraform projects. Default value: `infra/resources/`.
- **use_private_agent**: Indicates whether to use a private agent to run the
  `terraform plan` command. Default value: `false`.
- **override_github_environment**: Optional, use it when the "infra" GitHub
  environment of your repository is not `dev`, `uat`, nor `prod`, but another
  value. Always exclude the `cX` suffix.

:::warning

Make sure to configure `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, and
`ARM_CLIENT_ID` in your GitHub repository secrets for secure authentication.

:::

To receive notifications in Slack when drift is detected:

- [Create a Slack app and generate a webhook URL](https://api.slack.com/messaging/webhooks#getting_started)
- Take note of it
- Create a new repository secret in GitHub named `SLACK_WEBHOOK_URL` via
  Terraform, next to the `github-environment-bootstrap`
  [module](https://registry.terraform.io/modules/pagopa-dx/github-environment-bootstrap/github/latest):
  - Set a random value to `plaintext_value` property, like `placeholder`
  - Set the `ignore_changes` lifecycle for the `remote_updated_at` property
- Apply the Terraform code
- Once applied, manually change the secret value of `SLACK_WEBHOOK_URL` via
  GitHub portal with the actual webhook URL you generated in the previous step.
  This is necessary to prevent the webhook URL from being stored in the
  Terraform state file, which could pose a security risk

Below is an example of the steps described above:

```hcl
module "repo" {
  source  = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 1.0"
  [...]
}

resource "github_actions_secret" "slack_webhook_url" {
  repository      = module.repo.repository.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
```

When a drift is detected, a Slack message is sent to the selected channel. It
appears similar to this:

```plaintext
:x: Drift detected by Drift Detection.

Drift Detection results:
:shipit: Owner: Krusty93
:diamond_shape_with_a_dot_inside: Commit URL: 877c7f1d7ae22fe1a27db5275c290225d2c0eea4
:envelope: Commit message: update slack workflow
:page_with_curl: Terraform plan results:
:heavy_plus_sign: Resource to add: 1
:wavy_dash: Resource to change: 4
:heavy_minus_sign: Resource to destroy: 3
 Linked Repo: pagopa/dx
```
