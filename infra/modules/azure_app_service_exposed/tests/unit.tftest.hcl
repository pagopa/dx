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

run "azure_app_service_exposed_default_plan" {
  command = plan

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default App Service plan must use the P1v3 SKU."
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only && azurerm_linux_web_app.this.public_network_access_enabled
    error_message = "The exposed App Service must enforce HTTPS and allow public access."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "22-lts" && azurerm_linux_web_app.this.site_config[0].always_on
    error_message = "The exposed App Service must use Node 22 LTS and remain always on."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2" && azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The exposed App Service and staging slot must enforce TLS 1.2."
  }
}

run "azure_app_service_exposed_node_24" {
  command = plan

  variables {
    node_version = 24
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "24-lts"
    error_message = "The exposed App Service must support Node 24 LTS."
  }
}
