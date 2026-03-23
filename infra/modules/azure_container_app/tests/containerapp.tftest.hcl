provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

variables {
  environment = run.setup_tests.environment

  tags = run.setup_tests.tags

  use_case = "default"

  resource_group_name = run.setup_tests.resource_group_name

  container_app_environment_id = run.setup_tests.container_app_environment_id
  user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

  container_app_templates = [
    {
      image = "nginx:latest"

      app_settings = {
        "TEST1" = "value1",
        "TEST2" = "value2"
      }

      liveness_probe = {
        path = "/"
      }
    }
  ]

  secrets = [
    {
      name                = run.setup_tests.key_vault_secret1.name
      key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
    },
    {
      name                = run.setup_tests.key_vault_secret2.name
      key_vault_secret_id = run.setup_tests.key_vault_secret2.secret_id
    }
  ]
}

run "container_app_is_correct_plan" {
  command = plan

  variables {

  }

  assert {
    condition     = azurerm_container_app.this.name == "dx-d-itn-modules-test-ca-01"
    error_message = "The container app name is not correct"
  }

  assert {
    condition     = local.cpu_size == 1.25 && local.memory_size == "2.5Gi"
    error_message = "The container app size is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].image == "nginx:latest"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "nginx"
    error_message = "The container app container name auto-generated is wrong"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].termination_grace_period_seconds == 30
    error_message = "The container app termination grace period is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 1
    error_message = "The container app minimum replicas is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 8
    error_message = "The container app maximum replicas is not correct"
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env if env.secret_name == null
    ]) == 2 # number of settings set above
    error_message = "The number of variables in the container app is not correct"
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this.template[0].container[0].env :
      env if env.secret_name != null
    ]) == 2 # number of secrets set above
    error_message = "The number of secrets set as variables in the container app is not correct"
  }

  assert {
    condition = alltrue([
      for secret in azurerm_container_app.this.secret : secret.name == lower(secret.name)
    ])
    error_message = "The container app secrets names are not correct"
  }

  assert {
    condition = alltrue([
      for secret in azurerm_container_app.this.secret : contains([
        run.setup_tests.key_vault_secret1.secret_id,
        run.setup_tests.key_vault_secret2.secret_id
        ],
      secret.key_vault_secret_id)
    ])
    error_message = "The container app secrets kv references are not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].liveness_probe[0].path == "/"
    error_message = "The container app liveness probe path is not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this.template[0].container[0].env : contains([
        "TEST1",
        "TEST2"
        ],
      env.name)
      if env.secret_name == null
    ])
    error_message = "The container app setting names are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this.template[0].container[0].env : contains([
        "value1",
        "value2"
        ],
      env.value)
      if env.secret_name == null
    ])
    error_message = "The container app setting values are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this.template[0].container[0].env : contains([
        run.setup_tests.key_vault_secret1.name,
        run.setup_tests.key_vault_secret2.name,
        ],
      env.name)
      if env.secret_name != null
    ])
    error_message = "The container app environment secret names are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this.template[0].container[0].env : contains([
        replace(lower(run.setup_tests.key_vault_secret1.name), "_", "-"),
        replace(lower(run.setup_tests.key_vault_secret2.name), "_", "-"),
        ],
      env.secret_name)
      if env.secret_name != null
    ])
    error_message = "The container app environment secret values are not correct"
  }
}

run "container_app_correct_container_name" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "ghcr.io/pagopa/selfcare-dashboard-backend:sha-4b7f62d"

        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].image == "ghcr.io/pagopa/selfcare-dashboard-backend:sha-4b7f62d"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "selfcare-dashboard-backend"
    error_message = "The container app container name auto-generated is wrong"
  }
}

run "container_app_correct_custom_container_name" {
  command = plan

  variables {
    container_app_templates = [
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
    condition     = azurerm_container_app.this.template[0].container[0].image == "nginx:latest"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].name == "custom-nginx"
    error_message = "The container app container name auto-generated is wrong"
  }
}

run "container_app_correct_replicas" {
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
    condition     = length(azurerm_container_app.this.template[0].azure_queue_scale_rule) == 0
    error_message = "The container app should not have the Azure Queue Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].http_scale_rule) == 0
    error_message = "The container app should not have the Http Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].custom_scale_rule) == 0
    error_message = "The container app should not have the Custom Scale Rule configured"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "container_app_correct_custom_autoscaler" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"

        liveness_probe = {
          path = "/"
        }
      }
    ]

    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }

      custom_scalers = [
        {
          name             = "service-bus",
          custom_rule_type = "azure-servicebus",
          metadata = {
            queueName              = "queue-test",
            namespace              = "dx-d-itn-test-sbns-01"
            activationMessageCount = "2"
          }
        }
      ]
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      }
    ]
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].azure_queue_scale_rule) == 0
    error_message = "The container app should not have the Azure Queue Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].http_scale_rule) == 0
    error_message = "The container app should not have the Http Scale Rule configured"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].name == "service-bus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].custom_rule_type == "azure-servicebus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["queueName"] == "queue-test"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["namespace"] == "dx-d-itn-test-sbns-01"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["activationMessageCount"] == "2"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "container_app_correct_autoscalers" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"

        liveness_probe = {
          path = "/"
        }
      }
    ]

    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }

      azure_queue_scalers = [
        {
          queue_name   = "test-queue",
          queue_length = 5
          authentication = {
            secret_name       = run.setup_tests.key_vault_secret1.name,
            trigger_parameter = run.setup_tests.key_vault_secret1.name
          }
        }
      ],
      http_scalers = [
        {
          name                = "test-http-scaler",
          concurrent_requests = 10,
        }
      ]
      custom_scalers = [
        {
          name             = "service-bus",
          custom_rule_type = "azure-servicebus",
          metadata = {
            queueName              = "queue-test",
            namespace              = "dx-d-itn-test-sbns-01"
            activationMessageCount = "2"
          }
        }
      ]
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this.template[0].azure_queue_scale_rule[0].name == "test-queue"
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].azure_queue_scale_rule[0].queue_name == "test-queue"
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].azure_queue_scale_rule[0].queue_length == 5
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].name == "test-http-scaler"
    error_message = "The container app does not have the Http Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].http_scale_rule[0].concurrent_requests == "10"
    error_message = "The container app does not have the Http Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].name == "service-bus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].custom_rule_type == "azure-servicebus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["queueName"] == "queue-test"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["namespace"] == "dx-d-itn-test-sbns-01"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].custom_scale_rule[0].metadata["activationMessageCount"] == "2"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "container_app_correct_size" {
  command = plan

  variables {
    size = {
      cpu    = 2.5
      memory = "5Gi"
    }
  }
  assert {
    condition     = local.cpu_size == 2.5 && local.memory_size == "5Gi"
    error_message = "The container app size is not correct"
  }
}

run "container_app_override_size_wrong_mapping" {
  command = plan

  variables {
    size = {
      cpu    = 2.5
      memory = "6Gi"
    }
  }

  expect_failures = [
    var.size,
  ]
}

run "container_app_override_size_too_small" {
  command = plan

  variables {
    size = {
      cpu    = 0.1
      memory = "0.2Gi"
    }
  }

  expect_failures = [
    var.size,
  ]
}

run "container_app_override_size_wrong_increase" {
  command = plan

  variables {
    size = {
      cpu    = 0.6
      memory = "1.2Gi"
    }
  }

  expect_failures = [
    var.size,
  ]
}

run "container_app_override_size_too_large" {
  command = plan

  variables {
    size = {
      cpu    = 5
      memory = "10Gi"
    }
  }

  expect_failures = [
    var.size,
  ]
}

run "container_app_diagnostics_enabled_plan" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      storage_account_id         = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.container_app) == 1
    error_message = "Diagnostic setting should be created when enabled"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.container_app[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
    error_message = "Log Analytics workspace ID should be set correctly"
  }
}

run "container_app_public_access_enabled_plan" {
  command = plan

  variables {
    public_access_enabled = true
  }

  assert {
    condition     = azurerm_container_app.this.ingress[0].external_enabled == true
    error_message = "Container app should have external ingress enabled when public_access_enabled is true"
  }

  assert {
    condition     = azurerm_container_app.this.ingress[0].external_enabled == !false
    error_message = "Container app should not have internal-only ingress when public_access_enabled is true"
  }
}

run "container_app_authentication_plan" {
  command = plan

  variables {
    authentication = {
      azure_active_directory = {
        client_id                  = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        tenant_id                  = "ffffffff-0000-1111-2222-333333333333"
        client_secret_key_vault_id = run.setup_tests.key_vault_secret1.secret_id
      }
    }
  }

  assert {
    condition     = length([for s in azurerm_container_app.this.secret : s if s.name == "entra-id-client-secret"]) == 1
    error_message = "The entra-id-client-secret should be injected into Container App secrets when authentication is configured"
  }

  assert {
    condition = (
      [for s in azurerm_container_app.this.secret : s if s.name == "entra-id-client-secret"][0].key_vault_secret_id
      == run.setup_tests.key_vault_secret1.secret_id
    )
    error_message = "The entra-id-client-secret should reference the correct Key Vault secret"
  }
}

# ---- Validation failure tests ----

run "container_app_custom_domain_requires_public_access" {
  command = plan

  variables {
    public_access_enabled = false
    custom_domain = {
      host_name = "api.example.com"
      dns = {
        zone_name                = "example.com"
        zone_resource_group_name = "rg-dns"
      }
    }
  }

  expect_failures = [
    var.custom_domain,
  ]
}

run "container_app_custom_domain_requires_cert_or_dns" {
  command = plan

  variables {
    custom_domain = {
      host_name = "api.example.com"
    }
  }

  expect_failures = [
    var.custom_domain,
  ]
}

run "container_app_custom_domain_cert_and_dns_are_compatible" {
  command = plan

  variables {
    custom_domain = {
      host_name      = "api.example.com"
      certificate_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.App/managedEnvironments/env/certificates/cert"
      dns = {
        zone_name                = "example.com"
        zone_resource_group_name = "rg-dns"
      }
    }
  }

  # Both fields together is valid: pre-uploaded cert + automatic CNAME routing.
  # Only the CNAME is created; TXT and managed cert resources are skipped.
  assert {
    condition     = length(azurerm_dns_cname_record.this) == 1
    error_message = "CNAME record should be created when dns is provided alongside certificate_id"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 0
    error_message = "TXT validation record should NOT be created when certificate_id is provided"
  }

  assert {
    condition     = length(azapi_resource.managed_certificate) == 0
    error_message = "Managed certificate should NOT be provisioned when certificate_id is provided"
  }
}

run "container_app_custom_domain_hostname_must_be_subdomain" {
  command = plan

  variables {
    custom_domain = {
      host_name = "other.com"
      dns = {
        zone_name                = "example.com"
        zone_resource_group_name = "rg-dns"
      }
    }
  }

  expect_failures = [
    var.custom_domain,
  ]
}

run "container_app_custom_domain_apex_not_supported" {
  command = plan

  variables {
    custom_domain = {
      host_name = "example.com"
      dns = {
        zone_name                = "example.com"
        zone_resource_group_name = "rg-dns"
      }
    }
  }

  expect_failures = [
    var.custom_domain,
  ]
}

run "container_app_authentication_invalid_kv_uri" {
  command = plan

  variables {
    authentication = {
      azure_active_directory = {
        client_id                  = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        tenant_id                  = "ffffffff-0000-1111-2222-333333333333"
        client_secret_key_vault_id = "not-a-valid-kv-uri"
      }
    }
  }

  expect_failures = [
    var.authentication,
  ]
}
