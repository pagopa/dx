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
  }
}

run "policy_role_assignment_is_correct_apply" {
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
    condition     = module.key_vault.access_policy["io-p-rg-common|io-p-kv-common|reader||"].secret_permissions != []
    error_message = "The policy assigned must be a list with Get and List"
  }

  assert {
    condition     = module.key_vault.access_policy["io-p-rg-common|io-p-kv-common|reader||"].object_id == run.setup_tests.principal_id
    error_message = "The policy assignment must be assigned to the correct managed identity"
  }
}

run "policy_exec_role_test" {
  module {
    source = "./tests/exec"
  }
  
  variables {
    principal_id = run.setup_tests.principal_id
    resource = "key_vault"
    type = "policy"
  }

  assert {
    condition = output.role_assignments == true
    error_message = "The role assignment did not allow the correct access"
  }
}

run "rbac_role_assignment_is_correct_apply" {
  command = apply

  variables {
    principal_id = run.setup_tests.principal_id

    key_vault = [
      {
        name                = "io-p-itn-wallet-kv-01"
        resource_group_name = "io-p-itn-wallet-rg-01"
        roles = {
          secrets = "reader"
        }
      }
    ]
  }

  # Checks some assertions
  assert {
    condition     = module.key_vault.secrets_role_assignment["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|reader"].role_definition_name == "Key Vault Secrets User"
    error_message = "The role assigned must be Key Vault Secrets User"
  }

  assert {
    condition     = module.key_vault.secrets_role_assignment["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|reader"].principal_id == run.setup_tests.principal_id
    error_message = "The role assignment must be assigned to the correct managed identity"
  }
}

run "rbac_exec_role_test" {
  module {
    source = "./tests/exec"
  }
  
  variables {
    principal_id = run.setup_tests.principal_id
    resource = "key_vault"
  }

  assert {
    condition = output.role_assignments == true
    error_message = "The role assignment did not allow the correct access"
  }
}