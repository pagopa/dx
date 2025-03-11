---
sidebar_label: Ensuring Azure AppSettings Visibility in Terraform Plans
---

# Ensuring Azure AppSettings Visibility in Terraform Plans

## Overview

After a recent update to the `terraform` binary and the `azurerm` provider, the
Terraform Plan outputs no longer display the key-value pair differences when a
sensitive value is used in the `app_settings` property of an Azure (Function)
App.

```hcl
~ resource "azurerm_linux_function_app" "this" {
  ~ app_settings                        = (sensitive value)
    id                                  = <hidden>
    name                                = <hidden>
    tags                                = { hidden }
    # (32 unchanged attributes hidden)
}
```

As a result, it is difficult to predict what the actual changes are, undermining
the trust and confidence of developers in application deployment stage.

## The Proposed Workaround

To mitigate the problem and restore developers' confidence we propose here a
workaround that excludes any sensitive value from the app settings, by
leveraging the native integration between AppService and KeyVault.

In fact, an AppService (or an Azure Function) can access a KeyVault secret by:

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
available [here][def]

:::

Adopting this approach, Terraform will not consider values as sensitive in the
Plan output, showing the actual changes in the `app_settings` property.

Moreover, the approach of using KeyVault for secret management is an Azure best
practice with the following benefits:

- Updating a value in KeyVault does not require a Terraform Apply anymore:
  through the Azure Portal it is possible to force new values pulling from
  KeyVault
- If a secret reference is broken (e.g. missing secret, lack of read
  permissions, etc.), Azure Portal highlights it in red
- It becomes easier to track where secrets have been used

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

## Troubleshooting

Initially, we hypothesized that the issue stemmed from a specific version of
either `azurerm` or Terraform. To investigate, we attempted to replicate the
problem in a controlled environment by experimenting with different versions of
both tools. We set sensitive values in various ways, including through sensitive
outputs, sensitive variables, and the `sensitive` function.

Despite our efforts, we were unable to reproduce the issue. Additionally, we
observed inconsistent behaviors within the same Terraform configuration.

We also opened an issue on the
[azurerm GitHub repository](https://github.com/hashicorp/terraform-provider-azurerm/issues/28509),
but as of 07/03/2025, we have not received a response.
