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

run "azure_app_service_plan_autoscaler_requires_a_target_service" {
  command = plan

  variables {
    target_service = {
      app_services  = []
      function_apps = []
    }
  }

  expect_failures = [var.target_service]
}

run "azure_app_service_plan_autoscaler_rejects_ambiguous_target" {
  command = plan

  variables {
    target_service = {
      app_services = [{
        id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test"
        name = "app-test"
      }]
    }
  }

  expect_failures = [var.target_service]
}
