variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    Owner = "DevEx"
  }

  resource_group_name = "rg-test"
  app_settings        = {}
  slot_app_settings   = {}
  health_check_path   = "/health"
}

mock_provider "azurerm" {}
mock_provider "dx" {}

run "azure_app_service_exposed_rejects_unsupported_size" {
  command = plan

  variables {
    size = "F1"
  }

  expect_failures = [var.size]
}

run "azure_app_service_exposed_rejects_unsupported_node_version" {
  command = plan

  variables {
    node_version = 99
  }

  expect_failures = [var.node_version]
}
