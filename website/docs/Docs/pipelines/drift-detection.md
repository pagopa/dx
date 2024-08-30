---
sidebar_position: 1
sidebar_label: Drift Detection
---

## Drift Detection Workflow

The current [Drift Detection](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_drift_detection.yml) workflow is a GitHub Action that detects drift between the Terraform code and the actual state of the resource present in the `*.tfstate` file. Additionally, it checks for discrepancies between the state and the resources actually deployed on Azure.

> [!NOTE]
> If drift is detected, notifications are sent to Slack.

A detailed explanation of drift detection can be found in this HashiCorp article [here](https://www.hashicorp.com/blog/detecting-and-resolving-terraform-drift).

## Instructions

The workflow is defined as a template in the file `.github/workflows/infra_drift_detection.yml`. The configurable variables are:

- **environment**: Environment where the resources will be deployed. Default: `prod`
- **base_path**: Base path where the script will search for the Terraform projects. Default: `infra/resources/`
- **use_private_agent**: Use a private agent to run the `terraform plan` command. Default: `false`

To configure it, you need to call it as specified in the file [`.github/workflows/drift_detection_call.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/drift_detection_call.yaml):

```yaml
name: Drift Detection

on:
  workflow_dispatch:
  schedule:
      - cron: '00 08 * * *' # Run at 08:00 every day

jobs:
  drift_detection:
    uses: pagopa/dx/.github/workflows/infra_drift_detection.yml@main
    name: Drift Detection
    secrets: inherit
    with:
      environment: 'dev'
      base_path: 'infra/resources/'
```

With this configuration, the workflow runs every day at 8:00 AM and checks if the code under `infra/resources/dev` has any drift.

> [!NOTE]
> - Ensure that the secrets `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID` and `ARM_CLIENT_ID` are configured in your GitHub repository secrets to ensure secure authentication and notification delivery.
> - Use the secret `SLACK_WEBHOOK_URL` to specify the webhook URL.

> [!TIP]
> The Webhook URL is provided by Slack when you create an app. The workflow will look for this information in the secret `SLACK_WEBHOOK_URL`. If it’s not found, no Slack notification will be sent when drift is detected.

An example Slack notification might look like this:

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