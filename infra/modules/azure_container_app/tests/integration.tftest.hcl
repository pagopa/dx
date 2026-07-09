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
    app_name        = "def"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_container_app/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Container App integration tests"
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
    tags        = var.tags
  }
}

# Scenario 1: Default configuration
run "apply_default" {
  command = apply

  variables {
    environment                  = merge(var.environment, { instance_number = run.setup.instance_numbers.default })
    tags                         = var.tags
    resource_group_name          = run.setup.resource_group_name
    container_app_environment_id = run.setup.container_app_environment_id
    log_analytics_workspace_id   = run.setup.log_analytics_workspace_id

    containers = [
      {
        image = "nginx:latest"
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.revision_mode == "Multiple"
    error_message = "Default revision mode must be Multiple"
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].type == "SystemAssigned"
    error_message = "Default identity must be SystemAssigned"
  }

  assert {
    condition     = azurerm_container_app.this.ingress[0].external_enabled == true
    error_message = "External ingress must be enabled by default"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 1
    error_message = "Default minimum replicas must be 1"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 8
    error_message = "Default maximum replicas must be 8"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.container_app) == 1
    error_message = "Diagnostic setting must be created when log_analytics_workspace_id is set"
  }
}

# Scenario 2: Development use_case (smaller resources, no diagnostics required)
run "apply_development" {
  command = apply

  variables {
    environment                  = merge(var.environment, { instance_number = run.setup.instance_numbers.development, app_name = "dev" })
    tags                         = var.tags
    use_case                     = "development"
    resource_group_name          = run.setup.resource_group_name
    container_app_environment_id = run.setup.container_app_environment_id
    log_analytics_workspace_id   = null

    containers = [
      {
        image = "nginx:latest"
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "Development use_case must set minimum replicas to 0"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 2
    error_message = "Development use_case must set maximum replicas to 2"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.container_app) == 0
    error_message = "Diagnostic setting must not be created when log_analytics_workspace_id is null"
  }
}

# Scenario 3: Custom autoscaler with HTTP scaler
run "apply_with_http_scaler" {
  command = apply

  variables {
    environment                  = merge(var.environment, { instance_number = run.setup.instance_numbers.autoscaler, app_name = "http" })
    tags                         = var.tags
    resource_group_name          = run.setup.resource_group_name
    container_app_environment_id = run.setup.container_app_environment_id
    log_analytics_workspace_id   = run.setup.log_analytics_workspace_id

    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }
      http_scalers = [
        {
          name                = "http-scaler"
          concurrent_requests = 100
        }
      ]
    }

    containers = [
      {
        image = "nginx:latest"
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "Custom autoscaler minimum replicas must be applied"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 5
    error_message = "Custom autoscaler maximum replicas must be applied"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].name == "http-scaler"
    error_message = "HTTP scale rule must be created with the correct name"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].concurrent_requests == "100"
    error_message = "HTTP scale rule concurrent_requests must be set correctly"
  }
}
