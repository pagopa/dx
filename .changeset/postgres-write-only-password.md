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
