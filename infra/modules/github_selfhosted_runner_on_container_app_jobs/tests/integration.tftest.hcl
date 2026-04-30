provider "azurerm" {
  features {}
}

variables {
  test_kind = "integration"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"
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
    TestName       = "GitHub Self-Hosted Runner integration tests"
  }
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

run "apply_pat_auth_rbac" {
  command = apply

  variables {
    environment = merge(var.environment, { instance_number = "02" })
    tags        = var.tags

    resource_group_name = run.setup.resource_group_name

    repository = {
      name = "dx"
    }

    container_app_environment = {
      id       = run.setup.container_app_environment_id
      location = run.setup.container_app_environment_location
    }

    key_vault = {
      name                = run.setup.key_vault_name
      resource_group_name = run.setup.key_vault_resource_group_name
      use_rbac            = true
    }
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.id != null
    error_message = "Container App Job must be created"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.identity[0].type == "SystemAssigned"
    error_message = "Container App Job must use SystemAssigned managed identity"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.resource_group_name == run.setup.resource_group_name
    error_message = "Container App Job must be in the expected resource group"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.container_app_environment_id == run.setup.container_app_environment_id
    error_message = "Container App Job must reference the correct container app environment"
  }

  assert {
    condition     = length(azurerm_role_assignment.keyvault_containerapp) == 1
    error_message = "Key Vault Secrets User role assignment must be created when use_rbac=true"
  }

  assert {
    condition     = azurerm_role_assignment.keyvault_containerapp[0].role_definition_name == "Key Vault Secrets User"
    error_message = "Role assignment must use Key Vault Secrets User role"
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.keyvault_containerapp) == 0
    error_message = "No Key Vault access policy must be created when use_rbac=true"
  }
}

run "apply_github_app_auth" {
  command = apply

  variables {
    environment = merge(var.environment, { instance_number = "03" })
    tags        = var.tags

    resource_group_name = run.setup.resource_group_name

    repository = {
      name = "dx"
    }

    container_app_environment = {
      id       = run.setup.container_app_environment_id
      location = run.setup.container_app_environment_location
    }

    key_vault = {
      name                = run.setup.key_vault_name
      resource_group_name = run.setup.key_vault_resource_group_name
      use_rbac            = true
    }

    use_github_app = true
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.id != null
    error_message = "Container App Job must be created for GitHub App auth scenario"
  }

  assert {
    condition     = length(azurerm_container_app_job.github_runner.secret) == 3
    error_message = "GitHub App auth must reference exactly 3 Key Vault secrets"
  }

  assert {
    condition     = azurerm_container_app_job.github_runner.event_trigger_config[0].scale[0].rules[0].authentication[0].trigger_parameter == "appKey"
    error_message = "GitHub App auth must use appKey as KEDA trigger parameter"
  }

  assert {
    condition     = length(azurerm_role_assignment.keyvault_containerapp) == 1
    error_message = "Key Vault Secrets User role assignment must be created for GitHub App auth"
  }
}
