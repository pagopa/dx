---
"azure_postgres_server": major
---

Migrate `administrator_credentials` to write-only password support.

**Breaking change**: the `administrator_credentials` variable (object with `name` and `password` fields) has been replaced by two separate variables:

- `admin_username` (`string`) — the administrator login name
- `admin_password` (`string`, ephemeral + sensitive) — the administrator password, now passed as a write-only attribute (`administrator_password_wo`) so it is never persisted in Terraform state or plan output

A new optional variable `admin_password_version` (`number`, default `1`) is also available. Callers must increment this value when rotating the password to trigger an update, since Terraform cannot detect changes to write-only values.

**Migration**:

```hcl
# Before
module "postgres" {
  # ...
  administrator_credentials = {
    name     = "myadmin"
    password = var.db_password
  }
}

# After
module "postgres" {
  # ...
  admin_username = "myadmin"
  admin_password = var.db_password  # can be ephemeral
  # admin_password_version = 1       # increment on password rotation
}
```

Requires azurerm provider `>= 4.21` and Terraform `>= 1.11`.

---

### Recommended pattern: ephemeral password → Key Vault → postgres module

Generate the password ephemerally, store it in Key Vault without it ever touching
Terraform state, and pass it straight to the module:

```hcl
# 1. Generate an ephemeral random password (never written to state)
ephemeral "random_password" "db" {
  length  = 32
  special = true
}

# 2. Persist the password in Key Vault using the write-only attribute
#    (value_wo is sent to the provider on apply but never stored in state)
resource "azurerm_key_vault_secret" "db_password" {
  name             = "postgres-admin-password"
  key_vault_id     = azurerm_key_vault.this.id
  content_type     = "text/plain"
  value_wo         = ephemeral.random_password.db.result
  value_wo_version = 1  # increment when rotating the password
}

# 3. Pass the ephemeral value directly to the module
module "postgres" {
  source = "..."

  admin_username = "pgadmin"
  admin_password = ephemeral.random_password.db.result

  # When rotating: generate a new password, increment both version counters,
  # and apply — neither the old nor the new password will appear in state.
  admin_password_version = 1
}
```

> **Why two version counters?**
> Terraform cannot detect changes to write-only values. Incrementing
> `value_wo_version` on the Key Vault secret and `admin_password_version` on
> the module are the signals that tell Terraform to re-apply the new password
> to each resource on the next `terraform apply`.
