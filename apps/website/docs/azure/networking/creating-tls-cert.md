# Creating a new TLS certificate

## Overview

A reusable GitHub workflow is available to create and automatically renew TLS
certificates stored in Azure Key Vault, using Let's Encrypt via the ACME DNS-01
challenge over Azure DNS.

:::tip

See the full workflow reference — including prerequisites, inputs, and setup
instructions — in the
**[Generate TLS Certificate](../../pipelines/release-certificate.md)** workflow
documentation.

:::

This workflow should run on a schedule (e.g. every week) to ensure that
certificates never expire. A `workflow_dispatch` trigger with a `force_renewal`
input is also recommended to allow manual renewals when needed.

### Failure Alerting

Because this workflow runs on a schedule, failures may go unnoticed. The
workflow supports optional Slack notifications on failure: set the
`SLACK_WEBHOOK_URL` secret in your repository's GitHub Actions secrets pointing
to the desired Slack channel, and the workflow will automatically post an alert
whenever a scheduled run fails.
