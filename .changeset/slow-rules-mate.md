---
"azure_app_service_plan_autoscaler": major
---

# CHANGES

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
