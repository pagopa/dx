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
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_api_management/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure API Management unit tests"
  }

  resource_group_name        = "rg-test"
  use_case                   = "cost_optimized"
  publisher_email            = "example@pagopa.it"
  publisher_name             = "Example Publisher"
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability/providers/Microsoft.OperationalInsights/workspaces/law-test"

  virtual_network = {
    name                = "dx-d-itn-common-vnet-01"
    resource_group_name = "dx-d-itn-network-rg-01"
  }
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01"
    name                = "dx-d-itn-common-vnet-01"
    resource_group_name = "dx-d-itn-network-rg-01"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.azure_api_net
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/azure-api.net"
    name = "azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.management_azure_api_net
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/management.azure-api.net"
    name = "management.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.scm_azure_api_net
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/scm.azure-api.net"
    name = "scm.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.apim
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.azure-api.net"
    name = "privatelink.azure-api.net"
  }
}

override_data {
  target = data.azurerm_application_insights.this
  values = {
    id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability/providers/Microsoft.Insights/components/appi-test"
    name              = "appi-test"
    connection_string = "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://italynorth-0.in.applicationinsights.azure.com/"
  }
}

override_resource {
  target          = dx_available_subnet_cidr.apim
  override_during = plan

  values = {
    id                 = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01/24/10.50.100.0_24"
    virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01"
    prefix_length      = 24
    cidr_block         = "10.50.100.0/24"
  }
}

override_resource {
  target          = azurerm_subnet.apim
  override_during = plan

  values = {
    id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01/subnets/dx-d-itn-test-apim-snet-01"
    name                 = "dx-d-itn-test-apim-snet-01"
    address_prefixes     = ["10.50.100.0/24"]
    virtual_network_name = "dx-d-itn-common-vnet-01"
    resource_group_name  = "dx-d-itn-network-rg-01"
  }
}

override_resource {
  target          = azurerm_public_ip.apim
  override_during = plan

  values = {
    id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/dx-d-itn-test-pip-01"
    name              = "dx-d-itn-test-pip-01"
    allocation_method = "Static"
    sku               = "Standard"
    zones             = ["1", "2"]
  }
}

run "azure_api_management_cost_optimized_defaults" {
  command = plan

  assert {
    condition     = azurerm_api_management.this.sku_name == "StandardV2_1"
    error_message = "cost_optimized must use StandardV2_1."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "External"
    error_message = "cost_optimized must use External virtual networking."
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled == false
    error_message = "cost_optimized must disable public network access."
  }

  assert {
    condition     = length(azurerm_public_ip.apim) == 0
    error_message = "cost_optimized must not create a public IP."
  }

  assert {
    condition     = length(azurerm_private_endpoint.apim_pep) == 1
    error_message = "cost_optimized must create a private endpoint."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 1
    error_message = "cost_optimized must enable diagnostic settings."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "cost_optimized must enable the management lock."
  }
}

run "azure_api_management_subnet_created_from_dx_cidr" {
  command = plan

  assert {
    condition     = dx_available_subnet_cidr.apim.prefix_length == 24
    error_message = "APIM must request an available /24 subnet CIDR."
  }

  assert {
    condition     = length(azurerm_subnet.apim.address_prefixes) == 1 && contains(azurerm_subnet.apim.address_prefixes, "10.50.100.0/24")
    error_message = "APIM subnet must use the DX provider CIDR block."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_configuration[0].subnet_id == azurerm_subnet.apim.id
    error_message = "APIM must use the module-managed subnet."
  }
}

run "azure_api_management_high_load_public_ip_and_autoscale" {
  command = plan

  variables {
    use_case = "high_load"
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2"
    error_message = "high_load must use Premium_2."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "Internal"
    error_message = "high_load must use Internal virtual networking."
  }

  assert {
    condition     = length(azurerm_public_ip.apim) == 1
    error_message = "high_load must create a module-managed public IP."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == azurerm_public_ip.apim[0].id
    error_message = "high_load must attach the module-managed public IP."
  }

  assert {
    condition     = azurerm_public_ip.apim[0].allocation_method == "Static" && azurerm_public_ip.apim[0].sku == "Standard"
    error_message = "APIM public IP must be static and Standard SKU."
  }

  assert {
    condition     = length(azurerm_public_ip.apim[0].zones) == 2 && contains(azurerm_public_ip.apim[0].zones, "1") && contains(azurerm_public_ip.apim[0].zones, "2")
    error_message = "APIM public IP zones must follow the high_load use case."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].default == 2 && azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].maximum == 10
    error_message = "high_load autoscale defaults must be zone-aware."
  }
}

run "azure_api_management_development_defaults" {
  command = plan

  variables {
    use_case                   = "development"
    log_analytics_workspace_id = null
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Developer_1"
    error_message = "development must use Developer_1."
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled == true
    error_message = "development must keep public network access enabled."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "development must not enable diagnostic settings by default."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "development must not enable the management lock."
  }

  assert {
    condition     = length(azurerm_public_ip.apim) == 0
    error_message = "development must not create a public IP."
  }
}

run "azure_api_management_hostname_certificate_normalization" {
  command = plan

  variables {
    hostname_configuration = {
      proxy = {
        use_resource_name_as_default = true
      }
      management = [
        {
          host_name                = "management.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1/1234567890"
        }
      ]
    }
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].host_name == "${azurerm_api_management.this.name}.azure-api.net"
    error_message = "Proxy hostname must be managed from the APIM resource name."
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].default_ssl_binding == true
    error_message = "use_resource_name_as_default must drive proxy default SSL binding."
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].management[0].key_vault_certificate_id == "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
    error_message = "Versioned Key Vault certificate IDs must be normalized internally."
  }
}

run "azure_api_management_application_insights_by_id" {
  command = plan

  variables {
    application_insights = {
      id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability/providers/Microsoft.Insights/components/appi-test"
      sampling_percentage = 50
      verbosity           = "information"
    }
  }

  assert {
    condition     = length(azurerm_api_management_logger.this) == 1
    error_message = "Application Insights logger must be created when application_insights.id is set."
  }

  assert {
    condition     = azurerm_api_management_logger.this[0].application_insights[0].connection_string == data.azurerm_application_insights.this[0].connection_string
    error_message = "Application Insights connection string must be resolved from the resource ID."
  }

  assert {
    condition     = azurerm_api_management_diagnostic.applicationinsights[0].sampling_percentage == 50 && azurerm_api_management_diagnostic.applicationinsights[0].verbosity == "information"
    error_message = "Application Insights diagnostic settings must use the configured sampling and verbosity."
  }
}
