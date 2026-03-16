---
"azure_postgres_server": major
---

Migrate `administrator_credentials` to write-only password support, and add optional built-in Key Vault secret management.

## Breaking changes

### `administrator_credentials` removed

The `administrator_credentials` variable (object with `name` and `password` fields) has been replaced by two separate variables:

- `admin_username` (`string`) — the administrator login name
- `admin_password` (`string`, ephemeral + sensitive) — the administrator password, passed as a write-only attribute (`administrator_password_wo`) so it is never persisted in Terraform state or plan output

### `admin_password_version` is now mandatory

`admin_password_version` (`number`) has no default value. You must always set it explicitly. Start at `1` and increment it on every password rotation — this is the only signal Terraform has to re-apply a write-only value, since it cannot read back or diff ephemeral inputs.

### Provider version requirements

Requires azurerm provider `>= 4.23` (previously `>= 3.116`) and Terraform `>= 1.11`.

---

## New feature: optional Key Vault secret management

A new optional `key_vault` variable allows the module to create and manage an `azurerm_key_vault_secret` for the admin password automatically, using `value_wo` so the password is never stored in Terraform state.

```hcl
module "postgres" {
  # ...
  admin_username         = "pgadmin"
  admin_password         = ephemeral.random_password.db.result
  admin_password_version = 1

  # Optional: the module creates the KV secret and outputs its details.
  # Requires Key Vault Secrets Officer role on the vault for the Terraform identity.
  key_vault = {
    id = azurerm_key_vault.this.id
    # secret_name = "custom-name"  # optional; defaults to "<db-name>-admin-password"
  }
}
```

When `key_vault` is provided, the `admin_password_secret` output exposes `id`, `name`, `version`, and `versionless_id` of the secret. The password value is never exposed in outputs or state.

The `admin_password_version` counter drives both the PostgreSQL server write-only attribute and the Key Vault secret write-only attribute, so a single increment rotates both resources atomically.

---

## Migration guide

### Variable rename

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
  admin_username         = "myadmin"
  admin_password         = var.db_password  # can be ephemeral
  admin_password_version = 1
}
```

### Migrating a running production system

> **⚠️ Important**: `admin_password` is a write-only attribute. Terraform cannot read it back from state or diff it. On the first `terraform apply` after migration, Terraform **will always write** the password to the server — regardless of whether the value changed. This is expected, but it carries a risk.

**Safe migration steps:**

1. Update your module call to use `admin_username`, `admin_password`, and `admin_password_version = 1`.
2. Pass the **same existing password** as `admin_password`. Do not generate a new password during migration.
3. Run `terraform plan` and verify the only change is the write-only password update (expected — not harmful since the value is identical).
4. Run `terraform apply`. The DB password is re-written with the same value — no disruption to the running service.
5. Optionally clean up the old plaintext password value from state with `terraform state rm` or let it disappear on the next `terraform refresh`.

> **If you pass a different password by mistake**, Terraform will silently change your database admin password on apply with no warning. Always double-check the value you pass during migration.

