# Using Secrets in AppService Environment Variables

## Overview

Using secret values in AppService (or FunctionApp) is a common challenge for
developers. Terraform is often used to set secrets exported by other resources
such as Storage Accounts, but this approach is not convenient as involves lot of
downsides. In fact, anyone is able to read AppSettings, sensitive values are
stored in plain text in Terraform state file and the secret rotation must be
executed manually through Terraform.

This guide aims to instruct developers with best practices, providing guidelines
for a better secrets management including the following benefits:

- Updating a value in KeyVault does not require a Terraform Apply anymore:
  through the Azure Portal it is possible to force new values pulling from
  KeyVault
- If a secret reference is broken (e.g. missing secret, lack of read
  permissions, etc.), Azure Portal highlights it in red
- It becomes easier to track where secrets have been used

## How-To use Key Vault References as AppSettings

To use secrets from KeyVault as AppSettings values, you can follow these steps:

1. Granting the AppService's system-assigned managed identity access to read
   secrets:

   - For KeyVaults using Access Policies, assign `Get` and `List` permissions.
   - For KeyVaults using RBAC, assign the `Key Vault Secrets User` role.

2. By referencing the secrets from the AppService environment variables, using
   one between:

   - `@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)`
   - `@Microsoft.KeyVault(SecretUri=https://<kv-name>.vault.azure.net/secrets/<secret-name>)`

:::warning

Despite it is possible to refer a specific secret **version**, the practice is
discouraged as it requires a manual secret rotation. More information is
available in the
[official KeyVault documentation](https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation#key-rotation-policy).

:::

### Techniques to Facilitate the Code Refactoring

The shared approach requires some code refactoring. We recommend to encapsulate
the logic in the submodule of your AppService/Functions Apps in something like:

```hcl
locals {
  local.function_apps.common_app_settings,
  {
    for s in var.app_settings :
    s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${s.key_vault_secret_name})" : s.value
  }
}

variable "app_settings" {
  type = list(object({
    name                  = string
    value                 = optional(string, "")
    key_vault_secret_name = optional(string)
  }))
  description = "AppSettings configuration"
}
```

Then, the caller root module could use this code:

```hcl
app_settings = [
  {
    name                  = "secret1"
    key_vault_secret_name = "secret1"
  },
  {
    name                  = "secret2"
    key_vault_secret_name = "secret2"
  },
  {
    name  = "plan1"
    value = "plain value"
  },
]
```

### Managing Sensitive Resource Outputs

In some scenarios, the output of a Terraform module may include sensitive
values, leading to the issue described above.

To address this, you should save the output value into KeyVault and reference it
using the previously illustrated syntax.

To save a secret in the KeyVault:

```hcl
resource "azurerm_key_vault_secret" "example" {
  name         = "secret-sauce"
  value        = "szechuan"
  key_vault_id = azurerm_key_vault.example.id

  tags = local.tags
}
```

This code requires either the `Set` policy assignment or the
`Key Vault Secrets Officer` role.

More info can be found in the
[official KeyVault documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret).
