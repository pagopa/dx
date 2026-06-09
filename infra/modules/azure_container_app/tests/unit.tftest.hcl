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
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_container_app/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Container App unit tests"
  }

  resource_group_name          = "rg-test"
  container_app_environment_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
  log_analytics_workspace_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"

  containers = [
    {
      image = "nginx:latest"
      liveness_probe = {
        path = "/"
      }
    }
  ]
}

mock_provider "azurerm" {}
mock_provider "azapi" {}
mock_provider "dx" {}
mock_provider "time" {}

# Default configuration: naming, sizing, replicas, identity, ingress
run "container_app_default_configuration" {
  command = plan

  assert {
    condition     = azurerm_container_app.this.name == "dx-d-itn-modules-test-ca-01"
    error_message = "Container App name must follow naming convention"
  }

  assert {
    condition     = local.cpu_size == 1.25 && local.memory_size == "2.5Gi"
    error_message = "Default use_case must set cpu=1.25 and memory=2.5Gi"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 1
    error_message = "Default use_case must set minimum replicas to 1"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 8
    error_message = "Default use_case must set maximum replicas to 8"
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].type == "SystemAssigned"
    error_message = "Default identity type must be SystemAssigned when no user-assigned identity is provided"
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].identity_ids == null
    error_message = "identity_ids must be null when no user-assigned identity is provided"
  }

  assert {
    condition     = azurerm_container_app.this.ingress[0].external_enabled == true
    error_message = "External ingress must be enabled by default"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].termination_grace_period_seconds == 30
    error_message = "Termination grace period must be 30 seconds"
  }

  assert {
    condition     = azurerm_container_app.this.revision_mode == "Multiple"
    error_message = "Default revision mode must be Multiple"
  }
}

# Development use_case: smaller cpu/memory and different replica defaults
run "container_app_development_use_case" {
  command = plan

  variables {
    use_case                   = "development"
    log_analytics_workspace_id = null
  }

  assert {
    condition     = local.cpu_size == 0.5 && local.memory_size == "1Gi"
    error_message = "Development use_case must set cpu=0.5 and memory=1Gi"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "Development use_case must set minimum replicas to 0"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 2
    error_message = "Development use_case must set maximum replicas to 2"
  }
}

# Container name: auto-derived from simple image (nginx:latest → nginx)
run "container_app_container_name_from_simple_image" {
  command = plan

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "nginx"
    error_message = "Container name must be derived from simple image name by stripping the tag"
  }
}

# Container name: auto-derived from complex ghcr image
run "container_app_container_name_from_complex_image" {
  command = plan

  variables {
    containers = [
      {
        image = "ghcr.io/pagopa/selfcare-dashboard-backend:sha-4b7f62d"
        liveness_probe = {
          path = "/health"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "selfcare-dashboard-backend"
    error_message = "Container name must be derived from the last path segment of the image, minus the tag"
  }
}

# Container name: explicit name overrides auto-generation
run "container_app_custom_container_name" {
  command = plan

  variables {
    containers = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "custom-nginx"
    error_message = "Explicit container name must take precedence over auto-generation"
  }
}

# User-assigned identity: both SystemAssigned and UserAssigned are configured
run "container_app_user_assigned_identity" {
  command = plan

  variables {
    user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-test"
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].type == "SystemAssigned, UserAssigned"
    error_message = "Identity type must be 'SystemAssigned, UserAssigned' when a user-assigned identity is provided"
  }

  assert {
    condition = contains(
      tolist(azurerm_container_app.this.identity[0].identity_ids),
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-test"
    )
    error_message = "identity_ids must include the provided user-assigned identity"
  }
}

# System-assigned only: null user_assigned_identity_id
run "container_app_system_assigned_only" {
  command = plan

  variables {
    user_assigned_identity_id = null
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].type == "SystemAssigned"
    error_message = "Identity type must be SystemAssigned when user_assigned_identity_id is null"
  }

  assert {
    condition     = azurerm_container_app.this.identity[0].identity_ids == null
    error_message = "identity_ids must be null when user_assigned_identity_id is null"
  }
}

# Secret name normalization: uppercase and underscores → lowercase and dashes
run "container_app_secret_name_normalization" {
  command = plan

  variables {
    secrets = [
      {
        name                = "MY_SECRET_VALUE"
        key_vault_secret_id = "https://kv-test.vault.azure.net/secrets/my-secret"
      },
      {
        name                = "ANOTHER-SECRET"
        key_vault_secret_id = "https://kv-test.vault.azure.net/secrets/another-secret"
      }
    ]
  }

  assert {
    condition = alltrue([
      for s in azurerm_container_app.this.secret : s.name == lower(s.name)
    ])
    error_message = "All secret names must be lowercase"
  }

  assert {
    condition = !anytrue([
      for s in azurerm_container_app.this.secret : strcontains(s.name, "_")
    ])
    error_message = "Secret names must not contain underscores (must be replaced with dashes)"
  }
}

run "container_app_binds_secrets_per_container" {
  command = plan

  variables {
    secrets = [
      {
        name                = "APP_SECRET"
        key_vault_secret_id = "https://kv-test.vault.azure.net/secrets/app-secret"
      },
      {
        name                = "SIDECAR_SECRET"
        key_vault_secret_id = "https://kv-test.vault.azure.net/secrets/sidecar-secret"
      }
    ]

    containers = [
      {
        image        = "ghcr.io/pagopa/app:latest"
        name         = "app"
        secret_names = ["APP_SECRET"]
        liveness_probe = {
          path = "/health"
        }
      },
      {
        image        = "ghcr.io/pagopa/sidecar:latest"
        name         = "sidecar"
        secret_names = ["SIDECAR_SECRET"]
        liveness_probe = {
          path = "/status"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_container_app.this.secret) == 2
    error_message = "All secrets should still be defined in the container app"
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env if env.secret_name != null
    ]) == 1
    error_message = "The app container should receive only its explicitly bound secret"
  }

  assert {
    condition = contains([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env.name if env.secret_name != null
    ], "APP_SECRET")
    error_message = "The app container should receive APP_SECRET"
  }

  assert {
    condition = !contains([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env.name if env.secret_name != null
    ], "SIDECAR_SECRET")
    error_message = "The app container must not receive the sidecar secret"
  }

  assert {
    condition = contains([
      for env in azurerm_container_app.this.template[0].container[1].env :
      env.name if env.secret_name != null
    ], "SIDECAR_SECRET")
    error_message = "The sidecar container should receive SIDECAR_SECRET"
  }

  assert {
    condition = !contains([
      for env in azurerm_container_app.this.template[0].container[1].env :
      env.name if env.secret_name != null
    ], "APP_SECRET")
    error_message = "The sidecar container must not receive the app secret"
  }
}

# Custom size: explicit cpu and memory override use_case defaults
run "container_app_custom_size" {
  command = plan

  variables {
    size = {
      cpu    = 2.5
      memory = "5Gi"
    }
  }

  assert {
    condition     = local.cpu_size == 2.5 && local.memory_size == "5Gi"
    error_message = "Explicit size must override use_case cpu/memory defaults"
  }
}

# Custom replicas: autoscaler overrides use_case replica defaults
run "container_app_custom_replicas" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }
    }
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "Autoscaler minimum replicas must be applied"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 5
    error_message = "Autoscaler maximum replicas must be applied"
  }
}

# Restrict access: external_enabled = false when allow_access_from_environment_only = true
run "container_app_allow_access_from_environment_only" {
  command = plan

  variables {
    allow_access_from_environment_only = true
  }

  assert {
    condition     = azurerm_container_app.this.ingress[0].external_enabled == false
    error_message = "External ingress must be disabled when allow_access_from_environment_only is true"
  }
}

# Authentication: entra-id-client-secret must be added to secrets when authentication is configured
run "container_app_authentication_injects_secret" {
  command = plan

  variables {
    authentication = {
      azure_active_directory = {
        client_id                  = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        tenant_id                  = "ffffffff-0000-1111-2222-333333333333"
        client_secret_key_vault_id = "https://kv-test.vault.azure.net/secrets/entra-id-secret"
      }
    }
  }

  assert {
    condition     = length([for s in azurerm_container_app.this.secret : s if s.name == "entra-id-client-secret"]) == 1
    error_message = "The entra-id-client-secret must be injected into Container App secrets when authentication is configured"
  }

  assert {
    condition = (
      [for s in azurerm_container_app.this.secret : s if s.name == "entra-id-client-secret"][0].key_vault_secret_id
      == "https://kv-test.vault.azure.net/secrets/entra-id-secret"
    )
    error_message = "The entra-id-client-secret must reference the correct Key Vault secret URI"
  }
}

# Diagnostic settings: created when log_analytics_workspace_id is provided
run "container_app_diagnostics_enabled" {
  command = plan

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.container_app) == 1
    error_message = "Diagnostic setting must be created when log_analytics_workspace_id is set"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.container_app[0].log_analytics_workspace_id == var.log_analytics_workspace_id
    error_message = "Diagnostic setting must target the provided Log Analytics workspace"
  }
}

# Diagnostic settings: not created when log_analytics_workspace_id is null (development use_case)
run "container_app_diagnostics_disabled" {
  command = plan

  variables {
    use_case                   = "development"
    log_analytics_workspace_id = null
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.container_app) == 0
    error_message = "Diagnostic setting must not be created when log_analytics_workspace_id is null"
  }
}

# HTTP scaler: verify http_scale_rule is set correctly
run "container_app_http_scaler" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 10
      }
      http_scalers = [
        {
          name                = "http-scaler"
          concurrent_requests = 100
        }
      ]
    }
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].name == "http-scaler"
    error_message = "HTTP scale rule name must be set correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].concurrent_requests == "100"
    error_message = "HTTP scale rule concurrent_requests must be set correctly"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].azure_queue_scale_rule) == 0
    error_message = "Azure queue scale rule must not be created when not configured"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].custom_scale_rule) == 0
    error_message = "Custom scale rule must not be created when not configured"
  }
}

# Custom scaler: verify custom_scale_rule is set correctly
run "container_app_custom_scaler" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }
      custom_scalers = [
        {
          name             = "service-bus-scaler"
          custom_rule_type = "azure-servicebus"
          metadata = {
            queueName              = "my-queue"
            namespace              = "dx-d-itn-test-sbns-01"
            activationMessageCount = "2"
          }
        }
      ]
    }
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].name == "service-bus-scaler"
    error_message = "Custom scale rule name must be set correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].custom_rule_type == "azure-servicebus"
    error_message = "Custom scale rule type must be set correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["queueName"] == "my-queue"
    error_message = "Custom scale rule metadata must be set correctly"
  }
}

# App settings: env vars are mapped correctly from app_settings map
run "container_app_app_settings" {
  command = plan

  variables {
    containers = [
      {
        image = "nginx:latest"
        app_settings = {
          "KEY_ONE" = "value_one"
          "KEY_TWO" = "value_two"
        }
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env if env.secret_name == null
    ]) == 2
    error_message = "Two non-secret environment variables must be created from app_settings"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this.template[0].container[0].env :
      contains(["KEY_ONE", "KEY_TWO"], env.name) if env.secret_name == null
    ])
    error_message = "Environment variable names must match app_settings keys"
  }
}
