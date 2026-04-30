variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/github_selfhosted_runner_on_container_app_jobs/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "GitHub Self-Hosted Runner unit tests"
  }

  repository = {
    name = "my-repo"
  }

  container_app_environment = {
    id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
    location = "italynorth"
  }

  key_vault = {
    name                = "kv-test"
    resource_group_name = "rg-kv-test"
  }
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_client_config.current
  values = {
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "00000000-0000-0000-0000-000000000000"
    client_id       = "00000000-0000-0000-0000-000000000000"
    object_id       = "00000000-0000-0000-0000-000000000000"
  }
}

run "github_runner_system_assigned_identity" {
  command = plan

  assert {
    condition     = azurerm_container_app_job.github_runner.identity[0].type == "SystemAssigned"
    error_message = "Container App Job must use SystemAssigned managed identity"
  }
}

run "github_runner_replica_configuration" {
  command = plan

  assert {
    condition     = azurerm_container_app_job.github_runner.replica_timeout_in_seconds == 1800
    error_message = "Default replica_timeout_in_seconds must be 1800"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.replica_retry_limit == 1
    error_message = "replica_retry_limit must be 1"
  }
}

run "github_runner_event_trigger_defaults" {
  command = plan

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].max_executions == 30
    error_message = "Default max_executions must be 30"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].min_executions == 0
    error_message = "Default min_executions must be 0"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].polling_interval_in_seconds == 30
    error_message = "Default polling_interval_in_seconds must be 30"
  }
}

run "github_runner_container_defaults" {
  command = plan

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].cpu == 1.5
    error_message = "Default CPU must be 1.5"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].memory == "3Gi"
    error_message = "Default memory must be 3Gi"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].image == "ghcr.io/pagopa/github-self-hosted-runner-azure:latest"
    error_message = "Default image must be ghcr.io/pagopa/github-self-hosted-runner-azure:latest"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].name == "github-runner"
    error_message = "Container name must be github-runner"
  }
}

run "github_runner_pat_authentication" {
  command = plan

  assert {
    condition     = length(azurerm_container_app_job.github_runner.secret) == 1
    error_message = "PAT-based auth must configure exactly 1 Key Vault secret"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].trigger_parameter == "personalAccessToken"
    error_message = "PAT-based auth must use personalAccessToken trigger parameter"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].secret_name == "github-runner-pat"
    error_message = "PAT-based auth must use the default secret name github-runner-pat"
  }
}

run "github_runner_app_authentication" {
  command = plan

  variables {
    use_github_app = true
  }

  assert {
    condition     = length(azurerm_container_app_job.github_runner.secret) == 3
    error_message = "GitHub App auth must configure exactly 3 Key Vault secrets"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].trigger_parameter == "appKey"
    error_message = "GitHub App auth must use appKey trigger parameter"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].secret_name == "github-runner-app-key"
    error_message = "GitHub App auth must use github-runner-app-key secret"
  }
}

run "github_runner_keda_app_metadata" {
  command = plan

  variables {
    use_github_app = true
  }

  assert {
    condition     = contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "applicationIDFromEnv")
    error_message = "GitHub App auth must set applicationIDFromEnv in KEDA metadata"
  }

  assert {
    condition     = contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "installationIDFromEnv")
    error_message = "GitHub App auth must set installationIDFromEnv in KEDA metadata"
  }
}

run "github_runner_keda_pat_metadata" {
  command = plan

  assert {
    condition     = !contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "applicationIDFromEnv")
    error_message = "PAT auth must NOT set applicationIDFromEnv in KEDA metadata"
  }

  assert {
    condition     = !contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "installationIDFromEnv")
    error_message = "PAT auth must NOT set installationIDFromEnv in KEDA metadata"
  }
}

run "github_runner_labels_disabled" {
  command = plan

  assert {
    condition     = !contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "labels")
    error_message = "Labels must NOT appear in KEDA metadata when use_labels=false"
  }
}

run "github_runner_labels_enabled" {
  command = plan

  variables {
    container_app_environment = {
      id         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location   = "italynorth"
      use_labels = true
    }
  }

  assert {
    condition     = contains(keys(azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata), "labels")
    error_message = "Labels must appear in KEDA metadata when use_labels=true"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata["labels"] == "dev"
    error_message = "Default label for env_short=d must be dev"
  }
}

run "github_runner_override_labels" {
  command = plan

  variables {
    container_app_environment = {
      id              = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location        = "italynorth"
      use_labels      = true
      override_labels = ["custom-label", "another-label"]
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata["labels"] == "custom-label,another-label"
    error_message = "Override labels must be used as-is when provided"
  }
}

run "github_runner_key_vault_access_policy" {
  command = plan

  assert {
    condition     = length(azurerm_key_vault_access_policy.keyvault_containerapp) == 1
    error_message = "Access policy must be created when use_rbac=false"
  }

  assert {
    condition     = length(azurerm_role_assignment.keyvault_containerapp) == 0
    error_message = "No role assignment must be created when use_rbac=false"
  }
}

run "github_runner_key_vault_rbac" {
  command = plan

  variables {
    key_vault = {
      name                = "kv-test"
      resource_group_name = "rg-kv-test"
      use_rbac            = true
    }
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.keyvault_containerapp) == 0
    error_message = "No access policy must be created when use_rbac=true"
  }

  assert {
    condition     = length(azurerm_role_assignment.keyvault_containerapp) == 1
    error_message = "Role assignment must be created when use_rbac=true"
  }

  assert {
    condition     = azurerm_role_assignment.keyvault_containerapp[0].role_definition_name == "Key Vault Secrets User"
    error_message = "Role assignment must use Key Vault Secrets User role"
  }
}

run "github_runner_custom_resource_group" {
  command = plan

  variables {
    resource_group_name = "my-custom-rg"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.resource_group_name == "my-custom-rg"
    error_message = "Custom resource group name must be used when provided"
  }
}

run "github_runner_repo_url_env_var" {
  command = plan

  assert {
    condition = anytrue([
      for env in azurerm_container_app_job.github_runner.template[0].container[0].env :
      env.name == "REPO_URL" && env.value == "https://github.com/pagopa/my-repo"
    ])
    error_message = "REPO_URL env var must be set to https://github.com/pagopa/my-repo"
  }
}

run "github_runner_custom_scaling" {
  command = plan

  variables {
    container_app_environment = {
      id                          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location                    = "italynorth"
      max_instances               = 10
      min_instances               = 2
      polling_interval_in_seconds = 60
      replica_timeout_in_seconds  = 3600
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].max_executions == 10
    error_message = "Custom max_instances must be reflected in max_executions"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].min_executions == 2
    error_message = "Custom min_instances must be reflected in min_executions"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].polling_interval_in_seconds == 60
    error_message = "Custom polling_interval_in_seconds must be respected"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.replica_timeout_in_seconds == 3600
    error_message = "Custom replica_timeout_in_seconds must be respected"
  }
}

run "github_runner_custom_pat_secret_name" {
  command = plan

  variables {
    key_vault = {
      name                = "kv-test"
      resource_group_name = "rg-kv-test"
      secret_name         = "my-custom-pat-secret"
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].secret_name == "my-custom-pat-secret"
    error_message = "Custom secret_name must be used for PAT authentication"
  }
}

run "github_runner_custom_container_image" {
  command = plan

  variables {
    container_app_environment = {
      id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location = "italynorth"
      image    = "ghcr.io/custom/runner:v2.0"
      cpu      = 2
      memory   = "4Gi"
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].image == "ghcr.io/custom/runner:v2.0"
    error_message = "Custom image must be used"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].cpu == 2
    error_message = "Custom CPU must be used"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.template[0].container[0].memory == "4Gi"
    error_message = "Custom memory must be used"
  }
}
