# azure_app_service_plan_autoscaler

## 1.1.3

### Patch Changes

- e73a238: Add module version tag

## 1.1.2

### Patch Changes

- 9ce888c: Update Test to avoid conflict resources

## 1.1.1

### Patch Changes

- b1ef565: Update README with documentation and some variables description

## 1.1.0

### Minor Changes

- 889576c: Made target service name and id mutually exclusive to reduce entropy in the configuration

## 1.0.0

### Major Changes

- 7bc5adb: • Fixed a bug preventing the autoscaler from being deployed alongside a new App Service or Function App.
  • Refactored target_service to use structured objects (app_service / function_app) instead of separate name fields.
  • app_service_plan_id, resource_group_name, and location are now explicitly passed as variables instead of relying on computed values.

## 0.0.2

### Patch Changes

- 8dda982: Add a description in the package.json file
