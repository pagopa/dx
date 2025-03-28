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

run "rbac_role_assignment_is_correct" {
  command = plan

  variables {
    principal_id = run.setup_tests.principal_id
    subscription_id = run.setup_tests.subscription_id

    key_vault = [
      {
        name                = "dx-d-itn-common-kv-01"
        resource_group_name = "dx-d-itn-common-rg-01"
        has_rbac_support    = true
        description         = "This can read secrets"
        roles = {
          secrets = "reader"
        }
      }
    ]

    apim = [
      {
        name                = "dx-d-itn-playground-pg-apim-01"
        resource_group_name = "dx-d-itn-test-rg-01"
        role                = "owner"
        description         = "This is an owner"
      },
      {
        name                = "dx-d-itn-playground-pg-apim-01"
        resource_group_name = "dx-d-itn-test-rg-01"
        role                = "writer"
        description         = "This is a writer"
      },
      {
        name                = "dx-d-itn-playground-pg-apim-01"
        resource_group_name = "dx-d-itn-test-rg-01"
        role                = "reader"
        description         = "This is a reader"
      }
    ]

    storage_table = [
      {
        storage_account_name = "dxditnplaygrounddfstfd01"
        resource_group_name  = "dx-d-itn-test-rg-01"
        role                 = "reader"
        description          = "This is a reader"
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

  assert {
    condition     = module.apim.azurerm_role_assignment["dx-d-itn-test-rg-01|dx-d-itn-playground-pg-apim-01|owner"].role_definition_name == "API Management Service Contributor"
    error_message = "The role assigned must be API Management Service Contributor"
  }

  assert {
    condition     = module.apim.azurerm_role_assignment["dx-d-itn-test-rg-01|dx-d-itn-playground-pg-apim-01|writer"].role_definition_name == "API Management Service Operator Role"
    error_message = "The role assigned must be API Management Service Operator Role"
  }

  assert {
    condition     = module.apim.azurerm_role_assignment["dx-d-itn-test-rg-01|dx-d-itn-playground-pg-apim-01|reader"].role_definition_name == "API Management Service Reader Role"
    error_message = "The role assigned must be API Management Service Reader Role"
  }
}
