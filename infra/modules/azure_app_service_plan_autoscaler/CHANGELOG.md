# azure_app_service_plan_autoscaler

## 1.0.0

### Major Changes

- 7bc5adb: • Fixed a bug preventing the autoscaler from being deployed alongside a new App Service or Function App.
  • Refactored target_service to use structured objects (app_service / function_app) instead of separate name fields.
  • app_service_plan_id, resource_group_name, and location are now explicitly passed as variables instead of relying on computed values.

## 0.0.2

### Patch Changes

- 8dda982: Add a description in the package.json file
