variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "caetest"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_container_app_environment/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Container App Environment contract tests"
  }

  resource_group_name        = "rg-test"
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ops/providers/Microsoft.OperationalInsights/workspaces/law-test"

  use_case = "default"

  networking = {
    virtual_network_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
    private_dns_zone_resource_group_name = null
    public_network_access_enabled        = false
  }
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_private_dns_zone.this
  values = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.italynorth.azurecontainerapps.io"
    name = "privatelink.italynorth.azurecontainerapps.io"
  }
}

override_resource {
  target = dx_available_subnet_cidr.cae_subnet
  values = {
    id                 = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01/23/10.50.100.0_23"
    virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
    prefix_length      = 23
    cidr_block         = "10.50.100.0/23"
  }
}

# Contract: valid private configuration always creates diagnostic setting on the provided workspace
run "azure_container_app_environment_valid_private_config" {
  command = plan

  assert {
    condition     = azurerm_monitor_diagnostic_setting.cae.log_analytics_workspace_id == var.log_analytics_workspace_id
    error_message = "Valid private config must always create diagnostics on the provided Log Analytics workspace"
  }

  assert {
    condition     = azurerm_container_app_environment.this.logs_destination == "azure-monitor"
    error_message = "Valid config must always set logs_destination to azure-monitor"
  }

  assert {
    condition     = azurerm_private_endpoint.this[0].private_service_connection[0].subresource_names[0] == "managedEnvironments"
    error_message = "Private endpoint must target the managedEnvironments subresource"
  }

  assert {
    condition     = dx_available_subnet_cidr.cae_subnet.prefix_length == 23
    error_message = "CAE subnet prefix length must be 23 for use_case=default"
  }
}

# Contract: valid public configuration must not create a private endpoint
run "azure_container_app_environment_valid_public_config" {
  command = plan

  variables {
    networking = {
      virtual_network_id            = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
      public_network_access_enabled = true
    }
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 0
    error_message = "Valid public config must not create a private endpoint"
  }

  assert {
    condition     = azurerm_container_app_environment.this.internal_load_balancer_enabled == false
    error_message = "Valid public config must disable internal load balancer"
  }
}

# Contract: private DNS zone is auto-discovered in the VNet's resource group when private_dns_zone_resource_group_name is not set
run "azure_container_app_environment_auto_dns_zone_discovery" {
  command = plan

  assert {
    condition     = length(azurerm_private_endpoint.this) == 1
    error_message = "Private endpoint must be created when private_dns_zone_id is null (auto-discovery mode)"
  }
}

# Contract: when a custom private_dns_zone_resource_group_name is provided, it is used for the lookup
run "azure_container_app_environment_custom_dns_zone_rg" {
  command = plan

  variables {
    networking = {
      virtual_network_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
      private_dns_zone_resource_group_name = "rg-custom-dns"
    }
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 1
    error_message = "Private endpoint must be created when a custom private_dns_zone_resource_group_name is set"
  }
}

# Contract: invalid use_case value must fail validation
run "azure_container_app_environment_invalid_use_case" {
  command = plan

  variables {
    use_case = "invalid"
  }

  expect_failures = [
    var.use_case,
  ]
}

# Contract: development use_case must disable zone redundancy and management lock
run "azure_container_app_environment_development_use_case" {
  command = plan

  variables {
    use_case = "development"
  }

  override_resource {
    target = dx_available_subnet_cidr.cae_subnet
    values = {
      id                 = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01/27/10.50.100.0_27"
      virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
      prefix_length      = 27
      cidr_block         = "10.50.100.0/27"
    }
  }

  assert {
    condition     = azurerm_container_app_environment.this.zone_redundancy_enabled == false
    error_message = "Zone redundancy must be disabled for use_case=development"
  }

  assert {
    condition     = length(azurerm_management_lock.cae_lock) == 0
    error_message = "Management lock must not be created for use_case=development"
  }

  assert {
    condition     = dx_available_subnet_cidr.cae_subnet.prefix_length == 27
    error_message = "CAE subnet prefix length must be 27 for use_case=development"
  }
}
