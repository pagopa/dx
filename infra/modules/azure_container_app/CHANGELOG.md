# azure_container_app

## 2.0.0

### Major Changes

- 5731c31: Container image name is no longer stored in Terraform state file, to allow CD pipelines to update the tag without requiring an update to the Terraform code.

## 1.0.2

### Patch Changes

- e73a238: Add module version tag

## 1.0.1

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.0

### Major Changes

- b398ae3: The user-assigned managed identity is now used to authenticate the Container App with other Azure services.

  New features:

  - Add support to private Azure Container Registry
  - Add support to user-assigned managed identity

  Bug fixes:

  - The variable `readiness_probe.initial_delay` was unintentionally unused

  Documentation:

  - Add description for outputs

## 0.1.4

### Patch Changes

- b911497: Add principal_id property to outputs

## 0.1.3

### Patch Changes

- b013061: Replace naming convention module with DX provider functions
- a6eeb06: Auto generate the container name if not provided. Previous version used the image name as container name, but it contains invalid characters.

## 0.1.2

### Patch Changes

- 0fd9f3a: Replace some unsupported characters from secret names

## 0.1.1

### Patch Changes

- 8df9bae: Fix an issue which prevented to disable startup and and readiness probes.

## 0.1.0

### Minor Changes

- 9b7429b: Add support to secrets with KeyVault reference

## 0.0.3

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module
- 9d18d7c: Update README following new guide lines

## 0.0.2

### Patch Changes

- d29a1f4: Added new module for Azure Container App
