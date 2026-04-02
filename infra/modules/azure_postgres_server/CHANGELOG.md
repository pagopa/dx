## 3.0.0

### Major Changes

- 4f91f0d: Migrate `administrator_credentials` to write-only password support, and add optional built-in Key Vault secret management.

  ## Breaking changes

  ### `administrator_credentials` removed

  The `administrator_credentials` variable (object with `name` and `password` fields) has been replaced by two separate variables:
  - `admin_username` (`string`) — the administrator login name
  - `admin_password` (`string`, ephemeral + sensitive) — the administrator password, passed as a write-only attribute (`administrator_password_wo`) so it is never persisted in Terraform state or plan output

  ### `admin_password_version` is now mandatory

  `admin_password_version` (`number`) has no default value. You must always set it explicitly. Start at `1` and increment it on every password rotation — this is the only signal Terraform has to re-apply a write-only value, since it cannot read back or diff ephemeral inputs.

  ### Provider version requirements

  Requires azurerm provider `>= 4.23` (previously `>= 3.116`) and Terraform `>= 1.11`.

  ***

  ## New feature: optional Key Vault secret management

  A new optional `key_vault_id` variable allows the module to create and manage an `azurerm_key_vault_secret` for the admin password automatically, using `value_wo` so the password is never stored in Terraform state.

  ```hcl
  module "postgres" {
    # ...
    admin_username         = "pgadmin"
    admin_password         = ephemeral.random_password.db.result
    admin_password_version = 1

    # Optional: the module creates the KV secret and outputs its details.
    # Requires Key Vault Secrets Officer role on the vault for the Terraform identity.
    key_vault_id = azurerm_key_vault.this.id
  }
  ```

  When `key_vault_id` is provided, the module creates a secret named `<db-name>-admin-password` and the `admin_password_secret` output exposes `id`, `name`, `version`, and `versionless_id` of the secret. The password value is never exposed in outputs or state.

  The `admin_password_version` counter drives both the PostgreSQL server write-only attribute and the Key Vault secret write-only attribute, so a single increment rotates both resources atomically.

  ***

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

## 2.0.1

### Patch Changes

- 8f7ca94: Align examples

## 2.0.0

### Major Changes

- ea1cc48: # Major Changes
  1. Replaced the `tier` variable with a new `use_case` variable for tiering configuration.
  2. Add new variables for replica:
     - `create_replica`: Set to `true` by default, this determines whether or not to create a replica.
     - `replica_location`: optional value used to specify a different location for the replica

  3. Removed metrics block from azurerm_monitor_diagnostic_setting for deprecation .

  ## Upgrade Notes

  | Old Value | New Value | Description                                  |
  | --------- | --------- | -------------------------------------------- |
  | s         | _none_    | Now don't exist purposess                    |
  | m         | default   | Ideal for `production` environments purposes |
  | l         | _none_    | Now don't exist workloads                    |

  This change simplifies and clarifies the selection of Postgres Server tiers.

  For Example:
  - **Before**

    ```hcl
    module "postgres" {
      source  = "pagopa-dx/azure-postgres-server/azurerm
      version = "~> 1.0"

      tier    = "m"

      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "postgres" {
      source  = "pagopa-dx/azure-postgres-server/azurerm
      version = "~> 2.0"

      use_case = "default"

      # ...other variables remain unchanged...
    }
    ```

## 1.0.7

### Patch Changes

- c018fcb: Update PEP creation logic, if delegated subnet is defined pep will be not created. Now you must specify `subnet_pep_id` or `delegated_subnet_id`, not both. The private endpoint output is now optional and will return null if not created. This change is backward compatible.

  > [!WARNING]
  > The old output structure is going to be removed in the next major release, so users should update their configurations accordingly to avoid issues in future upgrades

## 1.0.6

### Patch Changes

- 493ae69: Add delegated_subnet_id variable

## 1.0.5

### Patch Changes

- e73a238: Add module version tag

## 1.0.4

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.3

### Patch Changes

- f5c125e: Replace naming convention module with DX provider functions

## 1.0.2

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module
- b8be01a: Update PostgreSQL module README

## 1.0.1

### Patch Changes

- 8c05dd7: Removed HA if WEU as Default, added override variable for HA

## 1.0.0

### Major Changes

- bc3027b: L tier now uses GP_Standard_D4ds_v5 as SKU, and M tier uses GP_Standard_D2ds_v5

## 0.1.1

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.0

### Minor Changes

- 00fccad: Added lock resource

## 0.0.7

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.6

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.5

### Patch Changes

- 393c2d0: Geo redundant backup not available in italy north

## 0.0.4

### Patch Changes

- df97631: Ignore changes on zone to avoid relocating the database after first apply

## 0.0.3

### Patch Changes

- afcf1f2: Added tests for each modules

## 0.0.2

### Patch Changes

- e4890b1: Added examples and removed required version for terraform
- 3b022b9: Examples updated and new standard for locals has been used
