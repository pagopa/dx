provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
}

run "app_service_plan_property_validation" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.rg_name
    tags                = run.setup_tests.tags

    tier = "s"
  }

  assert {
    condition     = azurerm_service_plan.this.name == "dx-d-itn-test-aasp-asp-01"
    error_message = "The App Service Plan name is incorrect"
  }

  assert {
    condition     = azurerm_service_plan.this.location == run.setup_tests.rg_location
    error_message = "The App Service Plan location is incorrect"
  }

  assert {
    condition     = azurerm_service_plan.this.resource_group_name == run.setup_tests.rg_name
    error_message = "The App Service Plan resource group name is incorrect"
  }

  assert {
    condition     = azurerm_service_plan.this.os_type == "Linux"
    error_message = "The App Service Plan OS type is not Linux"
  }
}

run "app_service_plan_sku_s" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.rg_name
    tags                = run.setup_tests.tags

    tier = "s"
  }

  assert {
    condition     = azurerm_service_plan.this.sku_name == "B1"
    error_message = "Tier s should have sku name B1"
  }

  assert {
    condition     = azurerm_service_plan.this.zone_balancing_enabled == false
    error_message = "Tier s should not have zone balancing enabled"
  }
}

run "app_service_plan_sku_m" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.rg_name
    tags                = run.setup_tests.tags

    tier = "m"
  }

  assert {
    condition     = azurerm_service_plan.this.sku_name == "P0v3"
    error_message = "Tier s should have sku name P0v3"
  }

  assert {
    condition     = azurerm_service_plan.this.zone_balancing_enabled == true
    error_message = "Tier s should have zone balancing enabled"
  }
}

run "app_service_plan_sku_l" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.rg_name
    tags                = run.setup_tests.tags

    tier = "l"
  }

  assert {
    condition     = azurerm_service_plan.this.sku_name == "P1v3"
    error_message = "Tier s should have sku name P1v3"
  }

  assert {
    condition     = azurerm_service_plan.this.zone_balancing_enabled == true
    error_message = "Tier s should have zone balancing enabled"
  }
}

run "app_service_plan_sku_xl" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.rg_name
    tags                = run.setup_tests.tags

    tier = "xl"
  }

  assert {
    condition     = azurerm_service_plan.this.sku_name == "P2v3"
    error_message = "Tier s should have sku name P2v3"
  }

  assert {
    condition     = azurerm_service_plan.this.zone_balancing_enabled == true
    error_message = "Tier s should have zone balancing enabled"
  }
}
