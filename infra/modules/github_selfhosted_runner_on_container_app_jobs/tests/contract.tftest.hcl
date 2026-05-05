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
    TestName       = "GitHub Self-Hosted Runner contract tests"
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

run "github_runner_repository_owner_used" {
  command = plan

  variables {
    repository = {
      owner = "myorg"
      name  = "my-repo"
    }
  }

  assert {
    condition = anytrue([
      for env in azurerm_container_app_job.github_runner.template[0].container[0].env :
      env.name == "REPO_URL" && env.value == "https://github.com/myorg/my-repo"
    ])
    error_message = "repository.owner must appear in REPO_URL"
  }
}

run "github_runner_repository_name_used_in_keda" {
  command = plan

  variables {
    repository = {
      name = "another-repo"
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].metadata["repos"] == "another-repo"
    error_message = "repository.name must be used in KEDA metadata repos field"
  }
}

run "github_runner_secret_name_used_in_keda" {
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
    error_message = "key_vault.secret_name must be used in KEDA authentication"
  }
}

run "github_runner_env_vars_passed_to_container" {
  command = plan

  variables {
    container_app_environment = {
      id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location = "italynorth"
      env_vars = {
        CUSTOM_VAR = "custom-value"
      }
    }
  }

  assert {
    condition = anytrue([
      for env in azurerm_container_app_job.github_runner.template[0].container[0].env :
      env.name == "CUSTOM_VAR" && env.value == "custom-value"
    ])
    error_message = "container_app_environment.env_vars must be passed to the container"
  }
}

run "github_runner_environment_id_used" {
  command = plan

  assert {
    condition     = azurerm_container_app_job.github_runner.container_app_environment_id == var.container_app_environment.id
    error_message = "container_app_environment_id must match the provided environment id"
  }
}

run "github_runner_location_used" {
  command = plan

  variables {
    container_app_environment = {
      id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.App/managedEnvironments/cae-test"
      location = "westeurope"
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.location == "westeurope"
    error_message = "Job location must match container_app_environment.location"
  }
}

run "github_runner_resource_group_name_used" {
  command = plan

  variables {
    resource_group_name = "my-custom-rg"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.resource_group_name == "my-custom-rg"
    error_message = "Custom resource_group_name must be used for the Container App Job"
  }
}
