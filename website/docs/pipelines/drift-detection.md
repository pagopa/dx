---
sidebar_position: 1
sidebar_label: Drift Detection
---

# Drift Detection Workflow

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

To use the Drift Detection workflow,
[create a new workflow file](https://docs.github.com/en/actions/quickstart#creating-your-first-workflow)
in your repository. The file should be named `infra_drift_detection.yml`:

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
```

Configuration variables are as follows:

- **environment**: Specifies the environment where the resources will be
  deployed. The default value is `prod`.
- **base_path**: Defines the base path where the script will search for the
  Terraform projects. The default value is `infra/resources/`.
- **use_private_agent**: Determines whether to use a private agent to run the
  `terraform plan` command. The default value is `false`.

With this configuration, the workflow runs every day at 8:00 AM and checks for
any drift in the code under `infra/resources/dev`.

:::warning

Make sure to configure `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, and
`ARM_CLIENT_ID` in your GitHub repository secrets for secure authentication.

:::

To receive notifications in Slack when drift is detected, set the GitHub secret
`SLACK_WEBHOOK_URL`. The webhook URL is provided by Slack when you create a new
app. For more information, refer to the
[Slack documentation](https://api.slack.com/messaging/webhooks).

An example of a Slack notification is shown below:

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
