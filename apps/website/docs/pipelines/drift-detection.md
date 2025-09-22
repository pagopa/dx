---
sidebar_position: 50
---

# Detecting Drift in Infrastructure as Code

The
[existing Drift Detection workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_drift_detection.yml)
is a GitHub Action that identifies any differences between the Terraform code
and the current state of the resources stored in the `*.tfstate` file. It also
verifies if there are any inconsistencies between the state and the resources
deployed on Azure.

:::note

Slack notifications will be sent if drift is detected.

:::

You may find more information in this
[article about drift detection](https://www.hashicorp.com/blog/detecting-and-resolving-terraform-drift).

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

- [Create a Slack app and generate a webhook URL](https://api.slack.com/messaging/webhooks#getting_started).
- Save the webhook URL in your Azure KeyVault as a secret
- Save the webhook URL as a GitHub secret named `SLACK_WEBHOOK_URL` in your
  GitHub repository settings. This step can be done easily using Terraform.
  Below is an example of how to do it:

```hcl
data "azurerm_key_vault_secret" "slack_webhook_url" {
  key_vault_id = data.azurerm_key_vault.your_kv.id
  name         = "slack-webhook-url-terraform-drift"
}

locals {
  # you may already have this section in `locals.tf`file. If so, just add the value to the existing `repo_secrets` map.
  repo_secrets = {
    "SLACK_WEBHOOK_URL" = data.azurerm_key_vault_secret.slack_webhook_url.value
  }
}

# you may already have this
resource "github_actions_secret" "repo_secrets" {
  for_each = local.repo_secrets

  repository      = module.repo.repository.name
  secret_name     = each.key
  plaintext_value = each.value
}
```

When drift is detected, a Slack message similar to the following will be sent:

```plaintext
Drift detected! Drift Detection action has failed
Drift Detection results:
Owner: [COMMIT OWNER NAME]
Commit URL: 12345XY
Commit message: [COMMIT MESSAGE]
Terraform plan results:
  + Resource to add: 0
  ~ Resource to change: 1
  - Resource to destroy: 0
Linked Repo: [REPOSITORY LINK]
```
