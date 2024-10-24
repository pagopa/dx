provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
  
  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
      CreatedBy   = "Terraform"
      Environment = "Prod"
      Owner       = "IO"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_role_assignment/tests/setup"
      Test        = "true"
      TestName    = "Create Function app for test"
    }
  }
}

run "role_assignment_is_correct_apply" {
  command = apply

  variables {
    principal_id = run.setup_tests.principal_id

    key_vault = [
      {
        name                = "io-p-kv-common"
        resource_group_name = "io-p-rg-common"
        roles = {
          secrets = "reader"
        }
      }
    ]
  }

  # Checks some assertions
  assert {
    condition     = module.key_vault.azurerm_role_assignment.secrets.role_definition_name == "Key Vault Secrets User"
    error_message = "The role assigned must be Key Vault Secrets User"
  }

  assert {
    condition     = module.key_vault.azurerm_role_assignment.secrets.principal_id == run.setup_tests.principal_id
    error_message = "The role assignment must be assigned to the correct managed identity"
  }
}

run "exec_role_test" {
  module {
    source = "./tests/exec"
  }
  
  variables {
    principal_id = run.setup_tests.principal_id
  }

  assert {
    condition = output.role_assignments == []
    error_message = "The role assignment did not allow the correct access"
  }
}