variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "cache"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_managed_redis/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure Managed Redis contract tests"
  }

  resource_group_name = "rg-test"

  virtual_network_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/vnet-test"
  private_dns_zone_resource_group_name = null

  use_case          = "default"
  sku_name_override = null

  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.OperationalInsights/workspaces/law-test"

  alerts = {
    action_group_id = null
    thresholds      = {}
  }
}

mock_provider "azurerm" {
  mock_data "azurerm_subscription" {
    defaults = {
      id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
      subscription_id = "00000000-0000-0000-0000-000000000000"
    }
  }
  mock_data "azurerm_private_dns_zone" {
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net"
    }
  }
}

run "invalid_use_case" {
  command = plan

  variables {
    use_case = "unsupported"
  }

  expect_failures = [
    var.use_case,
  ]
}

run "missing_virtual_network" {
  command = plan

  variables {
    virtual_network_id = null
  }

  expect_failures = [
    var.virtual_network_id,
  ]
}

run "missing_log_analytics_workspace" {
  command = plan

  variables {
    log_analytics_workspace_id = null
  }

  expect_failures = [
    var.log_analytics_workspace_id,
  ]
}

run "invalid_sku_override" {
  command = plan

  variables {
    sku_name_override = "MemoryOptimized_M10"
  }

  expect_failures = [
    var.sku_name_override,
  ]
}

run "invalid_virtual_network_id_format" {
  command = plan

  variables {
    virtual_network_id = "not-a-valid-resource-id"
  }

  expect_failures = [
    var.virtual_network_id,
  ]
}

run "balanced_b0_rejected_for_default_use_case" {
  command = plan

  variables {
    sku_name_override = "Balanced_B0"
  }

  expect_failures = [
    var.sku_name_override,
  ]
}

run "balanced_b0_allowed_for_development_use_case" {
  command = plan

  variables {
    use_case           = "development"
    virtual_network_id = null
    sku_name_override  = "Balanced_B0"
  }
}

run "pep_subnet_instance_number_derived_from_vnet_name" {
  command = plan

  variables {
    virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-03/providers/Microsoft.Network/virtualNetworks/vnet-test-03"
  }
}
