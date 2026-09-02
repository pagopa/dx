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
  publisher_email     = "example@pagopa.it"
  publisher_name      = "Example Publisher"
  subnet_id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-apim"
  subnet_pep_id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
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
  target = data.azurerm_private_dns_zone.azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.management_azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/management.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.scm_azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/scm.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.apim
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azure-api.net"
  }
}

run "azure_api_management_cost_optimized_defaults" {
  command = plan

  variables {
    application_insights = {
      enabled             = true
      connection_string   = "InstrumentationKey=00000000-0000-0000-0000-000000000000"
      id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Insights/components/appi-test"
      sampling_percentage = 50
      verbosity           = "error"
    }
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "StandardV2_1"
    error_message = "Cost-optimized APIM must use the StandardV2 SKU."
  }

  assert {
    condition     = length(azurerm_api_management_logger.this) == 1
    error_message = "Application Insights must create an APIM logger."
  }

  assert {
    condition     = azurerm_api_management.this.zones == null
    error_message = "Cost-optimized APIM must not configure availability zones."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "Monitoring must be disabled by default."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == null && azurerm_api_management.this.public_network_access_enabled
    error_message = "Cost-optimized APIM must use public network access without a public IP."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "External"
    error_message = "Cost-optimized APIM must use an external virtual network."
  }
}

run "azure_api_management_high_load_networking_and_autoscale" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      minimum_instances = 2
      default_instances = 4
      maximum_instances = 8
      scale_out_value   = "2"
      scale_in_value    = "2"
    }
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2"
    error_message = "High-load APIM must use the Premium SKU."
  }

  assert {
    condition     = length(azurerm_api_management.this.zones) == 2 && contains(azurerm_api_management.this.zones, "1") && contains(azurerm_api_management.this.zones, "2")
    error_message = "High-load APIM must use zones 1 and 2."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    error_message = "Internal high-load APIM must use the configured public IP."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "Internal"
    error_message = "High-load APIM must use an internal virtual network."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].default == 4
    error_message = "High-load APIM must retain the configured autoscale default capacity."
  }
}

run "azure_api_management_high_load_autoscale_defaults" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].minimum == 2 && azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].default == 2 && azurerm_monitor_autoscale_setting.this[0].profile[0].capacity[0].maximum == 10
    error_message = "High-load autoscale defaults must be multiplied by the two availability zones."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this[0].profile[0].rule[0].scale_action[0].value == 2 && azurerm_monitor_autoscale_setting.this[0].profile[0].rule[1].scale_action[0].value == 2
    error_message = "High-load autoscale rule values must be multiples of the two availability zones."
  }
}

run "azure_api_management_custom_domain_types" {
  command = plan

  variables {
    hostname_configuration = {
      proxy = [{
        host_name           = "api.example.com"
        key_vault_id        = "https://kv-test.vault.azure.net/secrets/cert-proxy"
        default_ssl_binding = true
      }]
      management = [{
        host_name    = "management.example.com"
        key_vault_id = "https://kv-test.vault.azure.net/secrets/cert-management"
      }]
      portal = [{
        host_name    = "portal.example.com"
        key_vault_id = "https://kv-test.vault.azure.net/secrets/cert-portal"
      }]
      developer_portal = [{
        host_name    = "developer.example.com"
        key_vault_id = "https://kv-test.vault.azure.net/secrets/cert-developer"
      }]
      scm = [{
        host_name    = "scm.example.com"
        key_vault_id = "https://kv-test.vault.azure.net/secrets/cert-scm"
      }]
    }
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].proxy) == 1 && azurerm_api_management.this.hostname_configuration[0].proxy[0].host_name == "api.example.com" && azurerm_api_management.this.hostname_configuration[0].proxy[0].default_ssl_binding
    error_message = "The proxy hostname configuration must be preserved."
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].management) == 1 && length(azurerm_api_management.this.hostname_configuration[0].portal) == 1 && length(azurerm_api_management.this.hostname_configuration[0].developer_portal) == 1 && length(azurerm_api_management.this.hostname_configuration[0].scm) == 1
    error_message = "All supported APIM custom-domain endpoint types must be configured."
  }
}
