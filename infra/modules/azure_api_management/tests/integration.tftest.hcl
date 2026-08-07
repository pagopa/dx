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
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"
    app_name        = "apim"
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
    TestName       = "Azure API Management integration tests"
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
  command = apply

  variables {
    environment = merge(var.environment, {
      app_name        = "apimdev"
      instance_number = run.setup.instance_numbers.development
    })
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    use_case            = "development"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

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

run "apply_cost_optimized" {
  command = apply

  variables {
    environment = merge(var.environment, {
      app_name        = "apimco"
      instance_number = run.setup.instance_numbers.cost_optimized
    })
    tags                       = var.tags
    resource_group_name        = run.setup.resource_group_name
    use_case                   = "cost_optimized"
    publisher_email            = "example@pagopa.it"
    publisher_name             = "Example Publisher"
    log_analytics_workspace_id = run.setup.log_analytics_workspace_id

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
