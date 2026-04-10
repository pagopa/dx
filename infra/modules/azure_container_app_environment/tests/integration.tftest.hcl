provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "pagopa-dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"
    app_name        = "cae"
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
    TestName       = "Container App Environment integration tests"
  }

  test_kind = "integration"
}

run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = var.environment
    test_kind   = var.test_kind
  }
}

# Scenario 1: private mode (internal load balancer enabled, private endpoint created)
run "azure_container_app_environment_apply_private" {
  command = apply

  variables {
    environment                = merge(var.environment, { instance_number = "11" })
    tags                       = var.tags
    resource_group_name        = run.setup.resource_group_name
    log_analytics_workspace_id = run.setup.log_analytics_workspace_id
    networking = {
      virtual_network                      = run.setup.virtual_network
      private_dns_zone_resource_group_name = null
      public_network_access_enabled        = false
    }
  }

  assert {
    condition     = azurerm_container_app_environment.this.logs_destination == "azure-monitor"
    error_message = "Logs destination must be azure-monitor"
  }

  assert {
    condition     = azurerm_container_app_environment.this.internal_load_balancer_enabled == true
    error_message = "Internal load balancer must be enabled in private mode"
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 1
    error_message = "Private endpoint must be created in private mode"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.cae.log_analytics_workspace_id == run.setup.log_analytics_workspace_id
    error_message = "Diagnostic settings must target the setup Log Analytics workspace"
  }
}

# Scenario 2: public mode (no internal load balancer, no private endpoint)
run "azure_container_app_environment_apply_public" {
  command = apply

  variables {
    environment                = merge(var.environment, { instance_number = "12" })
    tags                       = var.tags
    resource_group_name        = run.setup.resource_group_name
    log_analytics_workspace_id = run.setup.log_analytics_workspace_id
    networking = {
      virtual_network                      = run.setup.virtual_network
      private_dns_zone_resource_group_name = null
      public_network_access_enabled        = true
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
