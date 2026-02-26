# renew-tls-certificate

Composite GitHub Action that checks whether a TLS certificate stored in Azure Key Vault is close to expiration (or missing) and renews it via **Let's Encrypt** using the ACME DNS-01 challenge over Azure DNS.

Both the check and the renewal are executed in a **single job**, keeping the caller workflow minimal.

## Inputs

| Name                      | Required | Default   | Description                                                                                 |
| ------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------- |
| `force_renewal`           | No       | `"false"` | Force the certificate renewal to use when cron-triggered execution fails or troubleshooting |
| `key_vault_name`          | Yes      | —         | Name of the Azure Key Vault that stores the certificate                                     |
| `csr_common_name`         | Yes      | —         | Common Name (CN) for the Certificate Signing Request                                        |
| `dns_zone`                | Yes      | —         | Azure DNS Zone used for the ACME DNS-01 challenge                                           |
| `dns_zone_resource_group` | Yes      | —         | Resource Group that contains the DNS Zone                                                   |
| `arm_client_id`           | Yes      | —         | Azure Client ID (Workload Identity / Service Principal)                                     |
| `arm_subscription_id`     | Yes      | —         | Azure Subscription ID                                                                       |
| `arm_tenant_id`           | Yes      | —         | Azure Tenant ID                                                                             |
| `le_private_key_json`     | Yes      | —         | Let's Encrypt account private key in JWK JSON format                                        |
| `le_regr_json`            | Yes      | —         | Let's Encrypt account registration info in JSON format                                      |

## Outputs

| Name                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `renew_certificate` | `"true"` if the certificate was renewed, `"false"` otherwise |

## Usage

```yaml
jobs:
  renew-certificate:
    runs-on: ubuntu-latest
    environment: my-environment
    steps:
      - uses: actions/checkout@v4

      - uses: ./actions/renew-tls-certificate
        with:
          key_vault_name: "my-keyvault"
          csr_common_name: "example.com"
          dns_zone: "example.com"
          dns_zone_resource_group: "my-dns-rg"
          arm_client_id: ${{ secrets.ARM_CLIENT_ID }}
          arm_subscription_id: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          arm_tenant_id: ${{ secrets.ARM_TENANT_ID }}
          le_private_key_json: ${{ secrets.LE_PRIVATE_KEY_JSON }}
          le_regr_json: ${{ secrets.LE_REGR_JSON }}
```

## How it works

1. **Check**: Downloads the current certificate from Key Vault (if present) and verifies that it does not expire within 30 days (`CERTIFICATE_EXPIRATION=2592000` seconds). If expired, missing, or `force_renewal` is `true`, the renewal flow is triggered.
2. **Renew**: Logs in to Azure, generates a fresh RSA-2048 CSR, runs the ACME tiny client to complete the DNS-01 challenge against Azure DNS, converts the resulting certificate chain to PFX, and uploads it back to Key Vault.
