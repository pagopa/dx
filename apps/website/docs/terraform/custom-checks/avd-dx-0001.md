---
sidebar_position: 2
---

# Terraform must not read Key Vault secrets via data source

| Field        | Value                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**       | `DX-TF-0001`                                                                                                                                                          |
| **AVD ID**   | `AVD-DX-0001`                                                                                                                                                         |
| **Severity** | `HIGH`                                                                                                                                                                |
| **Source**   | DX                                                                                                                                                                    |
| **Provider** | Terraform                                                                                                                                                             |
| **Check**    | [`forbid_azurerm_key_vault_secret_data_source.rego`](https://github.com/pagopa/dx/blob/main/.trivy/checks/terraform/forbid_azurerm_key_vault_secret_data_source.rego) |

## Ensure Key Vault secret values are not read through Terraform data sources

Reading Key Vault secrets through the `data.azurerm_key_vault_secret` data
source exposes the plaintext secret value during Terraform evaluation. The
resolved value is written to the Terraform plan and to the state file, where it
remains in clear text regardless of how it is consumed afterwards.

State and plan artifacts should always be treated as sensitive, so secret values
must never be materialized into them.

### Impact

Plaintext secret values become accessible to anyone who can read the Terraform
plan or state, widening the blast radius of a credential leak.

## Recommended Actions

Follow the appropriate remediation steps below to resolve the issue.

### Terraform

Do not read secret values with `data.azurerm_key_vault_secret`. Instead, use
runtime secret references or the write-only secret pattern (`value_wo`) so that
the value never enters the Terraform plan or state.

#### Problematic Code

```hcl
data "azurerm_key_vault_secret" "bad_example" {
  name         = "my-secret"
  key_vault_id = azurerm_key_vault.this.id
}

resource "azurerm_app_service" "this" {
  # ...
  app_settings = {
    "SECRET" = data.azurerm_key_vault_secret.bad_example.value
  }
}
```

#### Recommended Code

```hcl
# Reference the secret at runtime via Key Vault references.
resource "azurerm_app_service" "this" {
  # ...
  app_settings = {
    "SECRET" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.this.name};SecretName=my-secret)"
  }
}
```

When you need to write a secret, prefer the write-only `value_wo` argument so
the value is kept out of state:

```hcl
resource "azurerm_key_vault_secret" "this" {
  name            = "my-secret"
  key_vault_id    = azurerm_key_vault.this.id
  value_wo        = var.secret_value
  value_wo_version = 1
}
```

### Links

- [`azurerm_key_vault_secret` data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)
- [Write-only arguments in Terraform](https://developer.hashicorp.com/terraform/language/resources/ephemeral/write-only)
- [Use Key Vault references for App Service and Azure Functions](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
