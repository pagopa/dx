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
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

run "rbac_role_assignment_is_correct_apply" {
  command = apply

  variables {
    principal_id = run.setup_tests.principal_id

    key_vault = [
      {
        name                = "dx-d-itn-common-kv-01"
        resource_group_name = "dx-d-itn-common-rg-01"
        roles = {
          secrets = "reader"
        }
      }
    ]
  }

  # Checks some assertions
  assert {
    condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].role_definition_name == "Key Vault Secrets User"
    error_message = "The role assigned must be Key Vault Secrets User"
  }

  assert {
    condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].principal_id == run.setup_tests.principal_id
    error_message = "The role assignment must be assigned to the correct managed identity"
  }
}
