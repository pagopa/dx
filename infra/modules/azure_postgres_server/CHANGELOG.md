# azure_postgres_server

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
