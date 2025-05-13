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

# run "key_vault_role_assignments" {
#   command = plan

#   variables {
#     principal_id    = run.setup_tests.principal_id
#     subscription_id = run.setup_tests.subscription_id

#     key_vault = [
#       {
#         name                = "dx-d-itn-common-kv-01"
#         resource_group_name = "dx-d-itn-common-rg-01"
#         has_rbac_support    = true
#         description         = "This can read secrets"
#         roles = {
#           secrets = "reader"
#         }
#       }
#     ]
#   }

#   assert {
#     condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].role_definition_name == "Key Vault Secrets User"
#     error_message = "The role assigned must be Key Vault Secrets User"
#   }

#   assert {
#     condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].principal_id == run.setup_tests.principal_id
#     error_message = "The role assignment must be assigned to the correct managed identity"
#   }
# }

# run "apim_role_assignments" {
#   command = plan

#   variables {
#     principal_id    = run.setup_tests.principal_id
#     subscription_id = run.setup_tests.subscription_id

#     apim = [
#       {
#         name                = "dx-d-itn-playground-pg-apim-01"
#         resource_group_name = "dx-d-itn-test-rg-01"
#         role                = "owner"
#         description         = "This is an owner"
#       },
#       {
#         name                = "dx-d-itn-playground-pg-apim-01"
#         resource_group_name = "dx-d-itn-test-rg-01"
#         role                = "writer"
#         description         = "This is a writer"
#       },
#       {
#         name                = "dx-d-itn-playground-pg-apim-01"
#         resource_group_name = "dx-d-itn-test-rg-01"
#         role                = "reader"
#         description         = "This is a reader"
#       }
#     ]
#   }
# }

run "service_bus_role_assignments" {
  command = plan

  variables {
    principal_id    = run.setup_tests.principal_id
    subscription_id = run.setup_tests.subscription_id

    service_bus = [
      {
        namespace_name      = "dx-d-itn-playground-sb-01"
        resource_group_name = "dx-d-itn-test-rg-01"
        role                = "reader"
        description         = "This is a reader"
        queue_names         = ["queue1", "queue2"]
      },
    ]
  }

  assert {
    condition     = module.service_bus != null
    error_message = "The service bus module should not be null"
  }
}
