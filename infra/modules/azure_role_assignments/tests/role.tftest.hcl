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

run "key_vault_role_assignments" {
  command = plan

  variables {
    principal_id    = run.setup_tests.principal_id
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
  }

  assert {
    condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].role_definition_name == "Key Vault Secrets User"
    error_message = "The role assigned must be Key Vault Secrets User"
  }

  assert {
    condition     = module.key_vault.secrets_role_assignment["dx-d-itn-common-rg-01|dx-d-itn-common-kv-01|reader"].principal_id == run.setup_tests.principal_id
    error_message = "The role assignment must be assigned to the correct managed identity"
  }
}

run "apim_role_assignments" {
  command = plan

  variables {
    principal_id    = run.setup_tests.principal_id
    subscription_id = run.setup_tests.subscription_id

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

run "service_bus_role_assignments" {
  command = plan

  variables {
    principal_id    = run.setup_tests.principal_id
    subscription_id = run.setup_tests.subscription_id

    service_bus = [
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "reader"
        description         = "This is a reader"
        queue_names         = ["queue1"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "writer"
        description         = "This is a writer"
        queue_names         = ["queue2"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "owner"
        description         = "This is an owner"
        queue_names         = ["queue3"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "reader"
        description         = "This is a reader"
        topic_names         = ["topic1"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "writer"
        description         = "This is a writer"
        topic_names         = ["topic2"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "owner"
        description         = "This is an owner"
        topic_names         = ["topic3"]
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "reader"
        description         = "This is a reader"
        subscriptions = {
          topic1 = ["subscription1"]
        }
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "writer"
        description         = "This is a writer"
        subscriptions = {
          topic2 = ["subscription2"]
        }
      },
      {
        namespace_name      = run.setup_tests.sb_namespace.name
        resource_group_name = run.setup_tests.sb_namespace.resource_group_name
        role                = "owner"
        description         = "This is an owner"
        subscriptions = {
          topic3 = ["subscription3"]
        }
      },
    ]
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.queues["${run.setup_tests.sb_namespace.id}|queue1|reader"].role_definition_name == "Azure Service Bus Data Receiver"
    error_message = "The role assigned must be Azure Service Bus Data Receiver"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.queues["${run.setup_tests.sb_namespace.id}|queue2|writer"].role_definition_name == "Azure Service Bus Data Sender"
    error_message = "The role assigned must be Azure Service Bus Data Sender"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.queues["${run.setup_tests.sb_namespace.id}|queue3|owner"].role_definition_name == "Azure Service Bus Data Owner"
    error_message = "The role assigned must be Azure Service Bus Data Owner"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.topics["${run.setup_tests.sb_namespace.id}|topic1|reader"].role_definition_name == "Azure Service Bus Data Receiver"
    error_message = "The role assigned must be Azure Service Bus Data Receiver"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.topics["${run.setup_tests.sb_namespace.id}|topic2|writer"].role_definition_name == "Azure Service Bus Data Sender"
    error_message = "The role assigned must be Azure Service Bus Data Sender"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.topics["${run.setup_tests.sb_namespace.id}|topic3|owner"].role_definition_name == "Azure Service Bus Data Owner"
    error_message = "The role assigned must be Azure Service Bus Data Owner"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.subscriptions["${run.setup_tests.sb_namespace.id}|topic1|subscription1|reader"].role_definition_name == "Azure Service Bus Data Receiver"
    error_message = "The role assigned must be Azure Service Bus Data Receiver"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.subscriptions["${run.setup_tests.sb_namespace.id}|topic2|subscription2|writer"].role_definition_name == "Azure Service Bus Data Sender"
    error_message = "The role assigned must be Azure Service Bus Data Sender"
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.subscriptions["${run.setup_tests.sb_namespace.id}|topic3|subscription3|owner"].role_definition_name == "Azure Service Bus Data Owner"
    error_message = "The role assigned must be Azure Service Bus Data Owner"
  }
}
