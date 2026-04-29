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
    TestName       = "Container App Environment unit tests"
  }

  resource_group_name        = "rg-test"
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ops/providers/Microsoft.OperationalInsights/workspaces/law-test"

  use_case = "development"

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
    id                 = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01/27/10.50.100.0_27"
    virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
    prefix_length      = 27
    cidr_block         = "10.50.100.0/27"
  }
}

# Private mode + development use_case (default in this suite): verifies networking, diagnostic settings, and development defaults
run "azure_container_app_environment_private_defaults" {
  command = plan

  assert {
    condition     = azurerm_container_app_environment.this.logs_destination == "azure-monitor"
    error_message = "Logs destination must be azure-monitor"
  }

  assert {
    condition     = azurerm_container_app_environment.this.internal_load_balancer_enabled == true
    error_message = "Internal load balancer must be enabled in private mode"
  }

  assert {
    condition     = azurerm_container_app_environment.this.zone_redundancy_enabled == false
    error_message = "Zone redundancy must be disabled in development environment"
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 1
    error_message = "Private endpoint must be created in private mode"
  }

  assert {
    condition     = length(azurerm_management_lock.cae_lock) == 0
    error_message = "Management lock must not be created in development environment"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.cae.log_analytics_workspace_id == var.log_analytics_workspace_id
    error_message = "Diagnostic setting must target the configured Log Analytics workspace"
  }

  assert {
    condition     = anytrue([for m in azurerm_monitor_diagnostic_setting.cae.enabled_metric : m.category == "AllMetrics"])
    error_message = "Diagnostic setting must enable AllMetrics"
  }

  assert {
    condition     = anytrue([for l in azurerm_monitor_diagnostic_setting.cae.enabled_log : l.category_group == "allLogs"])
    error_message = "Diagnostic setting must enable allLogs category group"
  }
}

# Public mode: no private endpoint, no internal load balancer
run "azure_container_app_environment_public_access" {
  command = plan

  variables {
    networking = {
      virtual_network_id            = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-01"
      public_network_access_enabled = true
    }
  }

  assert {
    condition     = azurerm_container_app_environment.this.internal_load_balancer_enabled == false
    error_message = "Internal load balancer must be disabled in public mode"
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 0
    error_message = "Private endpoint must not be created in public mode"
  }
}

# Default use case: zone redundancy and management lock must be enabled
run "azure_container_app_environment_default_use_case_lock_and_zone_redundancy" {
  command = plan

  variables {
    use_case = "default"
  }

  assert {
    condition     = azurerm_container_app_environment.this.zone_redundancy_enabled == true
    error_message = "Zone redundancy must be enabled for use_case=default"
  }

  assert {
    condition     = length(azurerm_management_lock.cae_lock) == 1
    error_message = "Management lock must be created for use_case=default"
  }
}

# Identity: system-assigned managed identity must always be enabled
run "azure_container_app_environment_system_assigned_identity" {
  command = plan

  assert {
    condition     = azurerm_container_app_environment.this.identity[0].type == "SystemAssigned"
    error_message = "Container App Environment must use SystemAssigned managed identity"
  }
}

# Subnet delegation: the created subnet must be delegated to Microsoft.App/environments
run "azure_container_app_environment_subnet_delegation" {
  command = plan

  assert {
    condition     = azurerm_subnet.this.delegation[0].service_delegation[0].name == "Microsoft.App/environments"
    error_message = "Subnet must be delegated to Microsoft.App/environments"
  }
}

# PEP subnet naming: instance_number must match the instance number of the VNet
run "azure_container_app_environment_pep_subnet_instance_number_follows_vnet" {
  command = plan

  variables {
    networking = {
      virtual_network_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-02"
      private_dns_zone_resource_group_name = null
      public_network_access_enabled        = false
    }
  }

  override_resource {
    target = dx_available_subnet_cidr.cae_subnet
    values = {
      id                 = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-02/27/10.50.102.0_27"
      virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-integration-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-integration-vnet-02"
      prefix_length      = 27
      cidr_block         = "10.50.102.0/27"
    }
  }

  assert {
    condition     = endswith(azurerm_private_endpoint.this[0].subnet_id, "/subnets/dx-d-itn-pep-snet-02")
    error_message = "PEP subnet name must use the instance number derived from the VNet name (expected suffix /subnets/dx-d-itn-pep-snet-02 for vnet-02)"
  }
}

# Subnet size: development use_case must request a /27 subnet
run "azure_container_app_environment_development_use_case_subnet_size" {
  command = plan

  assert {
    condition     = dx_available_subnet_cidr.cae_subnet.prefix_length == 27
    error_message = "CAE subnet prefix length must be 27 for use_case=development"
  }
}

# Subnet size: default use_case must request a /23 subnet
run "azure_container_app_environment_default_use_case_subnet_size" {
  command = plan

  variables {
    use_case = "default"
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

  assert {
    condition     = dx_available_subnet_cidr.cae_subnet.prefix_length == 23
    error_message = "CAE subnet prefix length must be 23 for use_case=default"
  }
}
