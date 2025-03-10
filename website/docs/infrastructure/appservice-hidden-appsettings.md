---
sidebar_label:
  Preserving Azure AppService AppSettings Visibility in Terraform Plan
---

# Hidden Preserving Azure AppService AppSettings Visibility in Terraform Plan

## Overview

Several developer teams have reported that their Terraform Plan outputs suddenly
stopped to show the key-value pair difference when at least a sensitive value is
being used, and include everything under a generic change of the property
`app_settings`.

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

By not being able to reproduce the issue, we propose the following workaround to
mitigate the problem and restore developers confidence.

The proposed workaround excludes any sensitive value from the app settings, by
leveraging the native integration between AppService and KeyVault services.

In fact, an AppService can access a KeyVault secret by:

- Giving AppService system-assigned managed identity the access to read secrets:
  - KeyVaults using Access Policies should give `Get` and `List` permissions
  - KeyVaults using RBAC should be given `Key Vault Secrets User`
- By referencing the secrets from the AppService environment variables
  - Use the syntax
    `@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)`

Adopting this approach, Terraform code will not have any sensitive value to
hide. Moreover, it is an Azure best practice with the following benefits:

- Updating a value in KeyVault does not require a Terraform Apply anymore:
  through the Azure Portal is possible to force new values pulling from KeyVault
- If a secret reference is broken (e.g. missing secret, lack of read
  permissions, etc.), Azure Portal highlights it in red
- It becomes easier to track where secrets have been used

### Techniques to Facilitate the Code Refactoring

However, this transition requires some code refactoring. We recommend to
encapsulate the logic in the submodule of your AppService/Functions Apps in
something like:

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

Unfortunately, like any other sensitive value it may cause the issue illustrated
above. Then, it is required to save that output value into the KeyVault and
referencing it via the special syntax previously illustrated.

To save the value in KeyVault:

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

More info can be found
[here](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret).

## Troubleshooting History

### Reproducing the issue

At the beginning, we thought the issue was caused by either a specific `azurerm`
or Terraform version. So we tried to replicate the issue in a safe environment
by playing with the version of the two, by setting sensitive values in various
ways: through a sensitive output, a sensitive variable or using the `sensitive`
function.

However, we couldn't reproduce the issue at all. We also found different
behaviors in the same Terraform configuration(!).

### GitHub issue on `azurerm` GitHub repository

[We also opened an issue](https://github.com/hashicorp/terraform-provider-azurerm/issues/28509)
on `azurerm` GitHub repository, but without any luck yet (07/03/2025).
