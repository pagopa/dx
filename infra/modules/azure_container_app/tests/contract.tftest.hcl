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
    TestName       = "Container App contract tests"
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

# --- use_case validation ---

run "invalid_use_case" {
  command = plan

  variables {
    use_case = "invalid-value"
  }

  expect_failures = [
    var.use_case,
  ]
}

# --- deployment_strategy validation ---

run "invalid_deployment_strategy" {
  command = plan

  variables {
    deployment_strategy = "invalid-mode"
  }

  expect_failures = [
    var.deployment_strategy,
  ]
}

# --- size validation ---

run "invalid_size_wrong_memory_mapping" {
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

run "invalid_size_too_small" {
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

run "invalid_size_wrong_step" {
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

run "invalid_size_too_large" {
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

run "valid_size_minimum_boundary" {
  command = plan

  variables {
    size = {
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  assert {
    condition     = local.cpu_size == 0.25 && local.memory_size == "0.5Gi"
    error_message = "Minimum valid size (0.25 cpu, 0.5Gi) must be accepted"
  }
}

run "valid_size_maximum_boundary" {
  command = plan

  variables {
    size = {
      cpu    = 4
      memory = "8Gi"
    }
  }

  assert {
    condition     = local.cpu_size == 4 && local.memory_size == "8Gi"
    error_message = "Maximum valid size (4 cpu, 8Gi) must be accepted"
  }
}

# --- autoscaler validation ---

run "invalid_autoscaler_replicas_max_zero" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 0
      }
    }
  }

  expect_failures = [
    var.autoscaler,
  ]
}

run "invalid_autoscaler_replicas_min_greater_than_max" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 5
        maximum = 2
      }
    }
  }

  expect_failures = [
    var.autoscaler,
  ]
}

# --- log_analytics_workspace_id validation ---

run "log_analytics_required_for_non_development_use_case" {
  command = plan

  variables {
    use_case                   = "default"
    log_analytics_workspace_id = null
  }

  expect_failures = [
    var.log_analytics_workspace_id,
  ]
}

# --- secrets contract validation ---

run "invalid_secret_binding_reference" {
  command = plan

  variables {
    secrets = [
      {
        name                = "APP_SECRET"
        key_vault_secret_id = "https://kv-test.vault.azure.net/secrets/app-secret"
      }
    ]

    containers = [
      {
        image        = "nginx:latest"
        secret_names = ["MISSING_SECRET"]
        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  expect_failures = [
    azurerm_container_app.this,
  ]
}

# --- custom_domain validation ---

run "custom_domain_requires_public_access" {
  command = plan

  variables {
    allow_access_from_environment_only = true
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

run "custom_domain_requires_cert_or_dns" {
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

run "custom_domain_hostname_must_be_subdomain_of_zone" {
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

run "custom_domain_apex_domain_not_supported" {
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

run "custom_domain_with_cert_id_only_is_valid" {
  command = plan

  variables {
    custom_domain = {
      host_name      = "api.example.com"
      certificate_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.App/managedEnvironments/env/certificates/cert"
    }
  }

  assert {
    condition     = length(azurerm_dns_cname_record.this) == 0
    error_message = "No CNAME record should be created when dns block is not provided"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 0
    error_message = "No TXT validation record should be created when dns block is not provided"
  }
}

run "custom_domain_cert_and_dns_together_is_valid" {
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

  assert {
    condition     = length(azurerm_dns_cname_record.this) == 1
    error_message = "CNAME record must be created when dns is provided alongside certificate_id"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 0
    error_message = "TXT validation record must NOT be created when certificate_id is provided"
  }

  assert {
    condition     = length(azapi_resource.managed_certificate) == 0
    error_message = "Managed certificate must NOT be provisioned when certificate_id is already provided"
  }
}

# --- authentication validation ---

run "authentication_invalid_kv_uri" {
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

# --- probe transport validation ---

run "invalid_liveness_probe_transport" {
  command = plan

  variables {
    containers = [
      {
        image = "nginx:latest"
        liveness_probe = {
          path      = "/"
          transport = "INVALID"
        }
      }
    ]
  }

  expect_failures = [
    var.containers,
  ]
}
