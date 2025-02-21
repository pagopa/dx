---
"azure_app_service_plan_autoscaler": major
---

•	Fixed a bug preventing the autoscaler from being deployed alongside a new App Service or Function App.
•	Refactored target_service to use structured objects (app_service / function_app) instead of separate name fields.
•	app_service_plan_id, resource_group_name, and location are now explicitly passed as variables instead of relying on computed values.
