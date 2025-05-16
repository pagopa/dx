# azure_app_service_plan_autoscaler

## 2.0.0

### Major Changes

- fa6f446: # CHANGES

  Add support for shared App Service Plans in the `azure_app_service_plan_autoscaler` module.
  This change allows defining multiple app services and function apps that share the same plan, enabling more efficient resource utilization and cost optimization.
  The autoscaler will now monitor the metrics from all services in the plan and scale accordingly.

  ## BREAKING CHANGE

  The configuration for `target_service` has been updated. Previously, you would define a single `app_service` or `function_app`. Now, `target_service` accepts lists of `app_services` and/or `function_apps` to support multiple services sharing the same plan.

  **Old configuration:**

  ```terraform
  target_service = {
    app_service = {
      id     = "your_app_service_id"
    }
  }
  ```

  **New configuration:**

  ```terraform
  target_service = {
    app_services = [
      {
        id     = "your_app_service_id"
      }
    ]
    # function_apps = [
    #   {
    #     id = "your_function_app_id"
    #   }
    # ]
  }
  ```

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
