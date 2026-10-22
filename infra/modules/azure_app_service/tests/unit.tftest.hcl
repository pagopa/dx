variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    Owner = "DevEx"
  }

  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
  subnet_cidr                          = "10.20.50.0/24"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  private_dns_zone_resource_group_name = "rg-network"
  app_settings                         = {}
  slot_app_settings                    = {}
  health_check_path                    = "/health"
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.app_service
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
  }
}

run "azure_app_service_default_plan" {
  command = plan

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default App Service plan must use the P1v3 SKU."
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only && azurerm_linux_web_app.this.site_config[0].always_on
    error_message = "The App Service must enforce HTTPS and remain always on."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "22-lts"
    error_message = "The default App Service stack must use Node 22 LTS."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2" && azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service and staging slot must enforce TLS 1.2."
  }

  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "A subnet must be created when a CIDR is supplied."
  }
}

run "azure_app_service_existing_subnet" {
  command = plan

  variables {
    subnet_cidr = null
    subnet_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-app"
  }

  assert {
    condition     = azurerm_subnet.this == []
    error_message = "No subnet must be created when an existing subnet is supplied."
  }
}

run "azure_app_service_custom_plan_sizes" {
  command = plan

  variables {
    size = "P2v3"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P2v3" && azurerm_service_plan.this[0].zone_balancing_enabled
    error_message = "The P2v3 override must enable zone balancing."
  }
}

run "azure_app_service_p0v3_disables_zone_balancing" {
  command = plan

  variables {
    size = "P0v3"
  }

  assert {
    condition     = !azurerm_service_plan.this[0].zone_balancing_enabled
    error_message = "The P0v3 override must disable zone balancing."
  }
}

run "azure_app_service_diagnostic_settings" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/sttest"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created when enabled with destinations."
  }
}

run "azure_app_service_disabled_diagnostic_settings" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = false
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Diagnostic settings must not be created when disabled."
  }
}

run "azure_app_service_node_24" {
  command = plan

  variables {
    node_version = 24
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "24-lts"
    error_message = "The App Service must support Node 24 LTS."
  }
}

run "azure_app_service_rejects_unsupported_tls_version" {
  command = plan

  variables {
    tls_version = 1.1
  }

  expect_failures = [var.tls_version]
}

run "azure_app_service_package_deployment_by_default" {
  command = plan

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1" && azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "The App Service and staging slot must run from package when no container image is set."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == null && azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].docker_image_name == null
    error_message = "No container image must be configured by default."
  }

  assert {
    condition     = !azurerm_linux_web_app.this.site_config[0].container_registry_use_managed_identity && !azurerm_linux_web_app_slot.this[0].site_config[0].container_registry_use_managed_identity
    error_message = "Managed identity registry pulls must be disabled by default."
  }
}

run "azure_app_service_container_image_docker_hub" {
  command = plan

  variables {
    container_image = "nginx:latest"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_registry_url == "https://index.docker.io" && azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == "nginx:latest"
    error_message = "Images without a registry must be pulled from Docker Hub."
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].docker_registry_url == "https://index.docker.io" && azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].docker_image_name == "nginx:latest"
    error_message = "The staging slot must use the same container image."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == null && azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].node_version == null
    error_message = "The language stack must not be configured for container images."
  }

  assert {
    condition     = !contains(keys(azurerm_linux_web_app.this.app_settings), "WEBSITE_RUN_FROM_PACKAGE") && !contains(keys(azurerm_linux_web_app_slot.this[0].app_settings), "WEBSITE_RUN_FROM_PACKAGE")
    error_message = "WEBSITE_RUN_FROM_PACKAGE must not be set for container images."
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITES_ENABLE_APP_SERVICE_STORAGE"] == "false" && azurerm_linux_web_app_slot.this[0].app_settings["WEBSITES_ENABLE_APP_SERVICE_STORAGE"] == "false"
    error_message = "App Service storage must be disabled for container images."
  }
}

run "azure_app_service_container_image_registry_with_namespace" {
  command = plan

  variables {
    container_image = "ghcr.io/pagopa/my-app:1.0.0"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_registry_url == "https://ghcr.io" && azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == "pagopa/my-app:1.0.0"
    error_message = "The registry must be split from the image name and tag."
  }

  assert {
    condition     = !azurerm_linux_web_app.this.site_config[0].container_registry_use_managed_identity
    error_message = "Managed identity registry pulls must be disabled for non-ACR registries."
  }
}

run "azure_app_service_container_image_acr" {
  command = plan

  variables {
    container_image = "dxcommonacr.azurecr.io/my-app:1.0.0"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_registry_url == "https://dxcommonacr.azurecr.io" && azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == "my-app:1.0.0"
    error_message = "The ACR image must be configured on the App Service."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].container_registry_use_managed_identity && azurerm_linux_web_app_slot.this[0].site_config[0].container_registry_use_managed_identity
    error_message = "The App Service and staging slot must pull from ACR with their managed identity."
  }
}

run "azure_app_service_package_state_for_container_migration" {
  command   = apply
  state_key = "package-to-container-migration"

  override_resource {
    target = azurerm_service_plan.this[0]
    values = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test"
    }
  }

  override_resource {
    target = azurerm_subnet.this[0]
    values = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/app-service"
    }
  }

  override_resource {
    target = azurerm_linux_web_app.this
    values = {
      id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-service-test"
      principal_id = "00000000-0000-0000-0000-000000000001"
    }
  }

  override_resource {
    target = azurerm_private_endpoint.app_service_sites
    values = {
      private_dns_zone_configs = [{
        id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
        name                = "app-service"
        private_dns_zone_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
        record_sets         = []
      }]
    }
  }

  override_resource {
    target = azurerm_private_endpoint.staging_app_service_sites[0]
    values = {
      private_dns_zone_configs = [{
        id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
        name                = "app-service-staging"
        private_dns_zone_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
        record_sets         = []
      }]
    }
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1" && azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "The migration must start from production and staging resources deployed from packages."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == null && azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].docker_image_name == null
    error_message = "The migration must start from production and staging resources without a configured container image."
  }
}

run "azure_app_service_replace_package_state_with_container" {
  command   = plan
  state_key = "package-to-container-migration"

  plan_options {
    replace = [
      azurerm_linux_web_app.this,
      azurerm_linux_web_app_slot.this[0]
    ]
  }

  variables {
    container_image = "nginx:1.0.0"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].docker_image_name == "nginx:1.0.0" && azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].docker_image_name == "nginx:1.0.0"
    error_message = "Replacing package-based production and staging resources must initialize the configured container image."
  }
}
