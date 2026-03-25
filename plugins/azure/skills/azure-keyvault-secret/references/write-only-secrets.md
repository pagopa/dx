# Write-Only Secrets in Terraform (value_wo)

## Why Secrets Leak into State

Using the `value` attribute within an `azurerm_key_vault_secret` resource is considered a security anti-pattern:

```hcl
# DON'T DO THIS!
resource "azurerm_key_vault_secret" "example" {
  name         = "my-secret"
  value        = "super-secret-value"   # ⚠️ stored in terraform.tfstate in plaintext
  key_vault_id = azurerm_key_vault.main.id
}
```

Terraform records every attribute in the state file. Anyone with access to the state
backend (blob storage, S3, local file) can read the secret value in plain text.

## The Write-Only Solution

Terraform 1.11 introduced **write-only attributes** (`value_wo`). A write-only attribute
is sent to the provider during `apply` but is never persisted in state. The azurerm
provider added support via `value_wo` in **version 4.23**.

```hcl
DO THIS INSTEAD
resource "azurerm_key_vault_secret" "example" {
  name             = "my-secret"
  value_wo         = ""    # write-only: not stored in state
  value_wo_version = 1     # increment to trigger an update cycle
  key_vault_id     = azurerm_key_vault.main.id
}
```

### value_wo = ""

Setting `value_wo = ""` creates the Key Vault secret as a **placeholder**. The actual
secret value must be injected through a separate, secure channel after the first
`terraform apply`:

- Azure CLI: `az keyvault secret set --vault-name <vault> --name <secret> --value <val>`
- CI/CD pipeline step (GitHub Actions, Azure DevOps)
- Azure Portal (manual)

This separation of concerns is intentional: Terraform manages the **existence** of the
secret resource; a secret manager or pipeline manages the **value**.

### value_wo_version

`value_wo_version` is a numeric trigger. Because Terraform cannot diff a write-only
attribute (it is never read back from state), the only way to tell Terraform "update
the secret on next apply" is to change `value_wo_version`. Increment it whenever:

- The secret rotation policy requires a new Terraform-triggered write.
- You change `value_wo` to a new non-empty ephemeral value.

Starting at `1` is the conventional default.

## Version Requirements

| Requirement | Minimum version |
|---|---|
| Terraform | **1.11.0** |
| azurerm provider | **4.23** |

Write-only attributes (`value_wo`) are a Terraform 1.11 language feature; the runtime
must understand them before the provider can use them. The azurerm provider added
`value_wo` support for `azurerm_key_vault_secret` in version 4.23.

Two sources pin the Terraform version and both must satisfy `>= 1.11.0`:

- **`.terraform-version`** — plain-text file in the project root used by `tfenv`/`tofuenv`
  to select the binary. If present, its value must be `>= 1.11.0`.
- **`required_version`** in a `terraform {}` block inside any `.tf` file — declares the
  version constraint enforced by Terraform itself at runtime.

A `required_version = ">= 1.11.0"` and an azurerm constraint like `~> 4.0` (or `~> 4.23`)
satisfy both requirements. Constraints like `~> 1.9`, `~> 3.x`, or `>= 3.116, < 5.0` do not.

## When to Use an Ephemeral Value Instead

If your Terraform code already produces the secret (e.g., a randomly generated
password), you can pass it directly as an ephemeral value:

```hcl
ephemeral "random_password" "db" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "db_password" {
  name             = "db-password"
  value_wo         = ephemeral.random_password.db.result
  value_wo_version = 2
  key_vault_id     = azurerm_key_vault.main.id
}
```

In this case `value_wo` is not empty, but it is still write-only. The `azure-keyvault-secret`
skill always defaults to `value_wo = ""` because it does not assume any ephemeral
source is available; adjust if your module provides one.

## References

- [Terraform write-only attributes (1.11)](https://developer.hashicorp.com/terraform/language/resources/ephemeral/write-only)
- [azurerm_key_vault_secret resource docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret)
- [azurerm provider changelog 4.23](https://github.com/hashicorp/terraform-provider-azurerm/releases/tag/v4.23.0)
