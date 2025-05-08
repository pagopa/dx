# azure_container_app_environment

## 1.0.2

### Patch Changes

- e73a238: Add module version tag

## 1.0.1

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.0

### Major Changes

- 5c2fe13: Export all details of the user-assigned managed identity

  **Migration guide**:

  Replace the occurrences of the exported property `user_assigned_identity` with `user_assigned_identity.client_id`

## 0.2.0

### Minor Changes

- 52dfa04: Features:

  - Add NoDelete locks for Container App Environment and the user-assigned managed identity

  Bug Fixes:

  - Fix the user-assigned managed identity name

### Patch Changes

- 5ceca52: Fix the potential collision with other resource names of the user-assigned managed identity

## 0.1.0

### Minor Changes

- fbec2b1: Create a user-assigned managed identity to be shared among all container apps of this environment

## 0.0.5

### Patch Changes

- b013061: Replace naming convention module with DX provider functions

## 0.0.4

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module
- 9d18d7c: Update README following new guide lines

## 0.0.3

### Patch Changes

- 0385c5a: Removed zone_redundant variable

## 0.0.2

### Patch Changes

- d29a1f4: Add new module for container app environment definition
