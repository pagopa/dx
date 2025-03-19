# azure_role_assignments

## 1.0.0

### Major Changes

- 4e8ca58: Role assignments can now be created contextually with identities and target resources

  **Migration guide**:
  When using the azurerm provider version >= 3.114.0, enable the beta opt-in feature to access the required provider-defined functions available from version 4 by setting the following environment variable:

  ```
  export ARM_FOURPOINTZERO_BETA=true
  ```

  A `description` field has been added to the role assignments. This field is **required** and can be used to provide why the role assignment is being created.

  Also, remove all `name` and `resource_group_name` parameters from the variables and use the id gotten from a resource, module or data source as follows:

  ```
  ...
  module "roles" {
    source       = "../../"
    principal_id = azurerm_user_assigned_identity.id.principal_id

    storage_table = [
      {
        storage_account_name = "test"
        resource_group_name  = "test-rg"
        table_name           = "test-table"
        role                 = "reader"
      }
    ]
  ...
  }
  ```

  becomes

  ```
  ...
  module "roles" {
    source       = "../../"
    principal_id = azurerm_user_assigned_identity.id.principal_id

    storage_table = [
      {
        storage_account_id = module.storage_account.id
        table_name         = "test-table"
        role               = "reader"
        description        = "Allow the test identity read access to the test-table"
      }
    ]
  ...
  }
  ```

## 0.1.3

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.2

### Patch Changes

- 075f30a: Fixed roles for API Management

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 63486e9: Storage account queues readers now have two azure roles assigned

### Patch Changes

- afcf1f2: Added tests for each modules
- 2503864: Removed unused locals and add default
