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
    app_name        = "def"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
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
    environment                  = merge(var.environment, { instance_number = run.setup.instance_numbers.development, app_name = "uat" })
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

run "apply_with_key_vault_secret_environment_variable" {
  command = apply

  variables {
    environment                  = merge(var.environment, { instance_number = run.setup.instance_numbers.key_vault_secret, app_name = "kv" })
    tags                         = var.tags
    resource_group_name          = run.setup.resource_group_name
    container_app_environment_id = run.setup.container_app_environment_id
    log_analytics_workspace_id   = run.setup.log_analytics_workspace_id
    user_assigned_identity_id    = run.setup.key_vault_secret_user_identity_id

    containers = [
      {
        image = "nginx:latest"
        environment_variables = [
          {
            name  = "INTEGRATION_SECRET"
            value = run.setup.key_vault_secret_id
          },
        ]
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].identity_ids[0] == run.setup.key_vault_secret_user_identity_id
    error_message = "Container App must use the identity authorized to read the Key Vault secret"
  }

  assert {
    condition     = length(azurerm_container_app.this.secret) == 1
    error_message = "Container App must create one native Key Vault secret"
  }

  assert {
    condition     = azurerm_container_app.this.secret[0].name == "integration-secret"
    error_message = "Key Vault secret name must be normalized from the environment variable name"
  }

  assert {
    condition     = azurerm_container_app.this.secret[0].key_vault_secret_id == run.setup.key_vault_secret_id
    error_message = "Container App secret must preserve the versioned Key Vault secret URI"
  }

  assert {
    condition     = azurerm_container_app.this.secret[0].identity == run.setup.key_vault_secret_user_identity_id
    error_message = "Container App secret must use the identity authorized to read it"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].env[1].secret_name == "integration-secret"
    error_message = "Environment variable must bind to the generated native Key Vault secret"
  }
}
