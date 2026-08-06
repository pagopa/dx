variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags                = { Owner = "DevEx" }
  resource_group_name = "rg-test"
  health_check_path   = "/health"
  app_settings        = {}
}

mock_provider "azurerm" {}

run "azure_function_app_exposed_rejects_unsupported_sku" {
  command = plan

  variables {
    size = "B1"
  }

  expect_failures = [var.size]
}

run "azure_function_app_exposed_rejects_unsupported_node_version" {
  command = plan

  variables {
    node_version = 99
  }

  expect_failures = [var.node_version]
}
