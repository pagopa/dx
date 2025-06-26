# azure_role_assignments

## 1.1.1

### Patch Changes

- 78c93b8: Enhance README with detailed Azure Storage role assignments

## 1.1.0

### Minor Changes

- 63bdf08: Add Service Bus support to manage queues, topics and subscriptions

## 1.0.3

### Patch Changes

- 53374ed: Fix variable validations for submodules still using ids instead of resource names

## 1.0.2

### Patch Changes

- 3c31efb: Add Documentation inside README.md

## 1.0.1

### Patch Changes

- acb24e0: Update README with module description and link to examples

## 1.0.0

### Major Changes

- 4e8ca58: Role assignments can now be created contextually with identities and target resources

  **Migration guide**:
  When using the azurerm provider version >= 3.114.0, enable the beta opt-in feature to access the required provider-defined functions available from version 4 by setting the following environment variable:

  ```
  export ARM_FOURPOINTZERO_BETA=true
  ```

  A `description` field has been added to the role assignments. This field is **required** and can be used to provide why the role assignment is being created.
  A `subscription_id` field has been added to the role assignments. This field is **required** and must be used to provide the subscription ID of the target resource.

  ```

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
