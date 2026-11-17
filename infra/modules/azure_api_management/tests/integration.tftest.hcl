provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "int"
    app_name        = "apim"
    instance_number = "01"
  }

  tags = {
    CostCenter  = "TS720 - DEV EX"
    Environment = "Uat"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/infra/modules/azure_api_management/tests"
    Test        = "true"
    TestName    = "Azure API Management integration tests"
  }

  test_kind = "integration"
}

run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = var.environment
    tags        = var.tags
    test_kind   = var.test_kind
  }
}

run "apply_development" {
  command   = apply
  state_key = "development"

  variables {
    environment = merge(var.environment, {
      app_name        = "apimdev"
      instance_number = run.setup.instance_numbers.development
    })
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    use_case                             = "development"
    publisher_email                      = "example@pagopa.it"
    publisher_name                       = "Example Publisher"

    virtual_network = run.setup.virtual_network_id
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Developer_1"
    error_message = "Development integration scenario must create a Developer_1 APIM."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_configuration[0].subnet_id == azurerm_subnet.apim.id
    error_message = "Development integration scenario must use the module-managed subnet."
  }

  assert {
    condition     = dx_available_subnet_cidr.apim.prefix_length == 24
    error_message = "Development integration scenario must allocate a /24 subnet."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "Development integration scenario must not enable diagnostic settings by default."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "Development integration scenario must not create a management lock."
  }
}

# Azure requires public access during creation; the next run disables it
# after the private endpoint exists, using the same state.
run "bootstrap_cost_optimized" {
  command   = apply
  state_key = "cost_optimized"

  variables {
    environment = merge(var.environment, {
      app_name        = "apimco"
      instance_number = run.setup.instance_numbers.cost_optimized
    })
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    use_case                             = "cost_optimized"
    publisher_email                      = "example@pagopa.it"
    publisher_name                       = "Example Publisher"
    log_analytics_workspace_id           = run.setup.log_analytics_workspace_id
    virtual_network                      = run.setup.virtual_network_id
    enable_public_network_access         = true
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled && length(azurerm_private_endpoint.apim_pep) == 1
    error_message = "Bootstrap must create APIM with public access enabled and its private endpoint before disabling public access."
  }
}

run "apply_cost_optimized" {
  command   = apply
  state_key = "cost_optimized"

  variables {
    environment = merge(var.environment, {
      app_name        = "apimco"
      instance_number = run.setup.instance_numbers.cost_optimized
    })
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    use_case                             = "cost_optimized"
    publisher_email                      = "example@pagopa.it"
    publisher_name                       = "Example Publisher"
    log_analytics_workspace_id           = run.setup.log_analytics_workspace_id

    virtual_network = run.setup.virtual_network_id
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "StandardV2_1"
    error_message = "Cost optimized integration scenario must create a StandardV2_1 APIM."
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled == false
    error_message = "Cost optimized integration scenario must disable public network access."
  }

  assert {
    condition     = length(azurerm_private_endpoint.apim_pep) == 1
    error_message = "Cost optimized integration scenario must create a private endpoint."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 1
    error_message = "Cost optimized integration scenario must enable diagnostic settings."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "Cost optimized integration scenario must create a management lock."
  }
}

run "apply_high_load" {
  command   = apply
  state_key = "high_load"

  variables {
    environment = merge(var.environment, {
      app_name        = "apimhl"
      instance_number = run.setup.instance_numbers.high_load
    })
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    use_case                             = "high_load"
    publisher_email                      = "example@pagopa.it"
    publisher_name                       = "Example Publisher"
    log_analytics_workspace_id           = run.setup.log_analytics_workspace_id
    virtual_network                      = run.setup.virtual_network_id
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2" && azurerm_api_management.this.virtual_network_type == "Internal"
    error_message = "High load must provision Premium_2 APIM with internal virtual networking."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_configuration[0].subnet_id == azurerm_subnet.apim.id && length(azurerm_subnet.apim.delegation) == 0
    error_message = "High load must use the module-managed, undelegated subnet."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == azurerm_public_ip.apim[0].id && azurerm_public_ip.apim[0].sku == "Standard"
    error_message = "High load must attach the module-managed Standard public IP."
  }

  assert {
    condition     = toset(azurerm_api_management.this.zones) == toset(["1", "2"]) && toset(azurerm_public_ip.apim[0].zones) == toset(["1", "2"])
    error_message = "High load APIM and its public IP must use availability zones 1 and 2."
  }

  assert {
    condition     = length(azurerm_monitor_autoscale_setting.this) == 1 && azurerm_monitor_autoscale_setting.this[0].target_resource_id == azurerm_api_management.this.id
    error_message = "High load must provision autoscaling for the APIM instance."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 1 && length(azurerm_monitor_metric_alert.this) == 6 && length(azurerm_management_lock.this) == 1
    error_message = "High load must provision diagnostics, metric alerts and a management lock."
  }
}
