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
    TestName       = "Azure API Management contract tests"
  }

  resource_group_name        = "rg-test"
  use_case                   = "cost_optimized"
  publisher_email            = "example@pagopa.it"
  publisher_name             = "Example Publisher"
  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-observability/providers/Microsoft.OperationalInsights/workspaces/law-test"

  virtual_network = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01"
}

mock_provider "azurerm" {}
mock_provider "dx" {}






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

run "azure_api_management_invalid_use_case" {
  command = plan

  variables {
    use_case = "invalid"
  }

  expect_failures = [
    var.use_case,
  ]
}

run "azure_api_management_invalid_virtual_network_id" {
  command = plan

  variables {
    virtual_network = "dx-d-itn-common-vnet-01"
  }

  expect_failures = [
    var.virtual_network,
  ]
}

run "azure_api_management_name_too_long" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "this-name-is-too-long-for-azure-api-management"
      instance_number = "01"
    }
  }

  expect_failures = [
    var.environment,
  ]
}

run "azure_api_management_requires_workspace_for_cost_optimized" {
  command = plan

  variables {
    log_analytics_workspace_id = null
  }

  expect_failures = [
    var.log_analytics_workspace_id,
  ]
}

run "azure_api_management_allows_no_workspace_for_development" {
  command = plan

  variables {
    use_case                   = "development"
    log_analytics_workspace_id = null
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "development must not require or create diagnostic settings."
  }
}

run "azure_api_management_autoscale_zone_values_must_match_zones" {
  command = plan

  variables {
    use_case = "high_load"
    autoscale = {
      minimum_instances             = 3
      default_instances             = 4
      maximum_instances             = 8
      scale_out_capacity_percentage = 60
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

run "azure_api_management_autoscale_default_must_be_in_range" {
  command = plan

  variables {
    autoscale = {
      minimum_instances             = 2
      default_instances             = 10
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_value               = "2"
      scale_in_value                = "2"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

run "azure_api_management_autoscale_values_must_be_positive" {
  command = plan

  variables {
    autoscale = {
      minimum_instances             = 2
      default_instances             = 2
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_value               = "0"
      scale_in_value                = "2"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

run "azure_api_management_invalid_application_insights_sampling" {
  command = plan

  variables {
    application_insights = {
      sampling_percentage = 101
      verbosity           = "error"
    }
  }

  expect_failures = [
    var.application_insights,
  ]
}

run "azure_api_management_invalid_application_insights_verbosity" {
  command = plan

  variables {
    application_insights = {
      sampling_percentage = 50
      verbosity           = "debug"
    }
  }

  expect_failures = [
    var.application_insights,
  ]
}

run "azure_api_management_valid_hostname_certificate_contract" {
  command = plan

  variables {
    hostname_configuration = {
      management = [
        {
          host_name                = "management.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1/1234567890"
        }
      ]
    }
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].management[0].key_vault_certificate_id == "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
    error_message = "Contract must accept versioned Key Vault certificate IDs and normalize them internally."
  }
}
