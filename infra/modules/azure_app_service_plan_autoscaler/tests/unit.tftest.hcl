variables {
  tags = {
    Owner = "DevEx"
  }

  location            = "italynorth"
  resource_group_name = "rg-test"
  app_service_plan_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/serverfarms/asp-test"
  target_service = {
    app_services = [{
      name = "app-test"
    }]
  }
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_linux_web_app.app_services["app-test"]
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test"
    name = "app-test"
  }
}

override_data {
  target = data.azurerm_linux_function_app.function_apps["function-test"]
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/function-test"
    name = "function-test"
  }
}

run "azure_app_service_plan_autoscaler_default_profile" {
  command = plan

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.target_resource_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/serverfarms/asp-test"
    error_message = "The autoscaler must target the configured App Service plan."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].maximum == 30 && azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].default == 12 && azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].minimum == 4
    error_message = "The high-load profile must preserve its default capacity values."
  }

  assert {
    condition     = length(azurerm_monitor_autoscale_setting.this.profile) > 0
    error_message = "The autoscaler must create profiles."
  }
}

run "azure_app_service_plan_autoscaler_shared_plan_request_rules" {
  command = plan

  variables {
    target_service = {
      app_services = [{
        name = "app-test"
      }]
      function_apps = [{
        name = "function-test"
      }]
    }
    scale_metrics = {
      cpu = {
        upper_threshold = 80
        lower_threshold = 20
        increase_by     = 1
        decrease_by     = 1
      }
      requests = {
        upper_threshold = 2000
        lower_threshold = 500
        increase_by     = 2
        decrease_by     = 1
      }
    }
  }

  assert {
    condition     = length([for rule in azurerm_monitor_autoscale_setting.this.profile[0].rule : rule if rule.metric_trigger[0].metric_name == "Requests"]) >= 4
    error_message = "A shared plan must create request rules for both services."
  }

  assert {
    condition     = contains([for rule in azurerm_monitor_autoscale_setting.this.profile[0].rule : rule.metric_trigger[0].metric_resource_id], "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test") && contains([for rule in azurerm_monitor_autoscale_setting.this.profile[0].rule : rule.metric_trigger[0].metric_resource_id], "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/function-test")
    error_message = "Shared-plan request rules must reference both configured services."
  }
}
