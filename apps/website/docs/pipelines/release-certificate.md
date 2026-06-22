---
sidebar_position: 7
---

# Generate TLS Certificate

:::info Reusable Workflow

| Workflow                     | Version | Source                                                                                                                |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| **Generate TLS Certificate** | v1      | [`release-certificate-v1.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-certificate-v1.yaml) |

:::

Reusable workflow that checks whether a TLS certificate stored in Azure Key
Vault is missing or close to expiration, and if so requests a new one from
**Let's Encrypt** via the ACME DNS-01 challenge using Azure DNS. The check and
renewal are handled by the underlying
[`renew-tls-certificate`](https://github.com/pagopa/dx/tree/main/actions/renew-tls-certificate)
composite action.

## How It Works

1. **Check**: Downloads the current certificate from Key Vault (if present) and
   verifies that it does not expire within 30 days. If the certificate is
   missing, expired, or `force_renewal` is `true`, the renewal flow is
   triggered.
2. **Renew**: Logs in to Azure, generates a fresh RSA-2048 CSR, runs the ACME
   client to complete the DNS-01 challenge against Azure DNS, converts the
   resulting certificate chain to PFX, and uploads it back to Key Vault.

## Prerequisites

Let's Encrypt account credentials are managed at the organization level. You
need to add them as repository secrets before using this workflow:

- `LETS_ENCRYPT_PRIVATE_KEY_JSON` — Let's Encrypt account private key in JWK
  JSON format (copy from organization secrets)
- `LETS_ENCRYPT_REGISTRATION_JSON` — Let's Encrypt account registration info in
  JSON format (copy from organization secrets)

## Inputs

| Name                      | Required | Default      | Description                                                                     |
| ------------------------- | -------- | ------------ | ------------------------------------------------------------------------------- |
| `key_vault_name`          | Yes      | —            | Name of the Azure Key Vault storing the certificate                             |
| `csr_common_name`         | Yes      | —            | Common Name (CN) for the Certificate Signing Request (e.g. `myapp.example.com`) |
| `dns_zone`                | Yes      | —            | Azure DNS Zone used for the ACME DNS-01 challenge (e.g. `example.com`)          |
| `dns_zone_resource_group` | Yes      | —            | Resource Group that contains the DNS Zone                                       |
| `force_renewal`           | No       | `false`      | Force renewal even if the certificate is not close to expiration                |
| `environment`             | No       | `infra-prod` | GitHub Environment prefix; the workflow runs in `{environment}-cd`              |

## Usage

Call the workflow from your repository using `workflow_call`. Schedule it to run
periodically (e.g. weekly) to ensure certificates never expire.

```yaml
name: Renew TLS Certificate

on:
  workflow_dispatch:
    inputs:
      force_renewal:
        description: "Force certificate renewal"
        required: false
        default: "false"
        type: boolean
  schedule:
    - cron: "0 8 * * 1" # Every Monday at 08:00 UTC

permissions:
  contents: read
  id-token: write

jobs:
  renew:
    name: "myapp.example.com"
    uses: pagopa/dx/.github/workflows/release-certificate-v1.yaml@main
    secrets: inherit
    with:
      key_vault_name: "my-keyvault"
      csr_common_name: "myapp.example.com"
      dns_zone: "example.com"
      dns_zone_resource_group: "my-dns-rg"
      force_renewal: ${{ inputs.force_renewal || false }}
      environment: "automation-prod"
```

### Force a Renewal Manually

You can trigger the workflow manually from the GitHub Actions UI using
`workflow_dispatch` and set `force_renewal` to `true` to bypass the expiry
check. This is useful when troubleshooting or recovering from a failed renewal.

## Failure Alerting

Because this workflow runs on a schedule, failures may go unnoticed. The
workflow supports optional Slack notifications: when a scheduled run fails, it
automatically posts an alert to a Slack channel if the `SLACK_WEBHOOK_URL`
secret is configured as a repository secret pointing to the desired channel.
