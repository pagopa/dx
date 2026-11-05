variables {
  principal_id    = "11111111-1111-1111-1111-111111111111"
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

mock_provider "azurerm" {
  mock_data "azurerm_client_config" {
    defaults = { tenant_id = "22222222-2222-2222-2222-222222222222" }
  }
}

run "role_assignments_maps_key_vault_roles" {
  command = plan
  variables {
    key_vault = [{
      name                = "kv-test"
      resource_group_name = "rg-test"
      has_rbac_support    = true
      description         = "Read secrets"
      roles               = { secrets = "reader" }
    }]
  }

  assert {
    condition     = module.key_vault.secrets_role_assignment["rg-test|kv-test|reader"].role_definition_name == "Key Vault Secrets User"
    error_message = "Key Vault secret reader must map to Key Vault Secrets User."
  }
}

run "role_assignments_maps_apim_roles" {
  command = plan
  variables {
    apim = [
      { name = "apim-test", resource_group_name = "rg-test", role = "reader", description = "Read APIs" },
      { name = "apim-test", resource_group_name = "rg-test", role = "writer", description = "Operate APIs" },
      { name = "apim-test", resource_group_name = "rg-test", role = "owner", description = "Manage APIs" },
    ]
  }

  assert {
    condition     = module.apim.azurerm_role_assignment["rg-test|apim-test|reader"].role_definition_name == "API Management Service Reader Role"
    error_message = "APIM reader must map to its data-plane reader role."
  }

  assert {
    condition     = module.apim.azurerm_role_assignment["rg-test|apim-test|owner"].role_definition_name == "API Management Service Contributor"
    error_message = "APIM owner must map to its contributor role."
  }
}

run "role_assignments_maps_service_bus_scopes" {
  command = plan
  variables {
    service_bus = [{
      namespace_name      = "sb-test"
      resource_group_name = "rg-test"
      role                = "writer"
      description         = "Send messages"
      queue_names         = ["queue1"]
      topic_names         = ["topic1"]
      subscriptions       = { topic1 = ["subscription1"] }
    }]
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.queues["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ServiceBus/namespaces/sb-test|queue1|writer"].role_definition_name == "Azure Service Bus Data Sender"
    error_message = "Queue writer must map to Azure Service Bus Data Sender."
  }

  assert {
    condition     = module.service_bus.azurerm_role_assignment.subscriptions["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ServiceBus/namespaces/sb-test|topic1|subscription1|writer"].role_definition_name == "Azure Service Bus Data Sender"
    error_message = "Subscription writer must map to Azure Service Bus Data Sender."
  }
}

run "role_assignments_maps_app_configuration_roles" {
  command = plan
  variables {
    app_config = [{ name = "appcs-test", resource_group_name = "rg-test", role = "owner", description = "Manage configuration" }]
  }

  assert {
    condition     = module.app_config.azurerm_role_assignment["rg-test|appcs-test|owner|App Configuration Contributor"].role_definition_name == "App Configuration Contributor"
    error_message = "App Configuration owner must include a contributor assignment."
  }
}

run "role_assignments_maps_managed_redis_roles" {
  command = plan
  variables {
    managed_redis = [
      { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test", role = "reader", description = "Read Redis" },
      { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test", role = "writer", description = "Write Redis" },
    ]
  }

  assert {
    condition     = module.managed_redis.azurerm_role_assignment["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test|reader"].role_definition_name == "Azure Managed Redis Reader"
    error_message = "Managed Redis reader must receive the control-plane reader role."
  }

  assert {
    condition     = length(module.managed_redis.azurerm_managed_redis_access_policy_assignment) == 1
    error_message = "Managed Redis data-plane policies must be deduplicated by instance."
  }
}

run "role_assignments_maps_cosmos_roles" {
  command = plan
  variables {
    cosmos = [
      { account_name = "cosmos-test", resource_group_name = "rg-test", role = "reader", description = "Read data", database = "db1", collections = ["container1"] },
      { account_name = "cosmos-test", resource_group_name = "rg-test", role = "owner", description = "Manage data", database = "db2", collections = ["container2"] },
    ]
  }

  assert {
    condition     = module.cosmos.azurerm_cosmosdb_sql_role_assignment["cosmos-test|db1|container1|reader"].role_definition_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-test/sqlRoleDefinitions/00000000-0000-0000-0000-000000000001"
    error_message = "Cosmos reader must map to the built-in data reader role."
  }

  assert {
    condition     = module.cosmos.azurerm_role_assignment["cosmos-test|rg-test"].role_definition_name == "DocumentDB Account Contributor"
    error_message = "Cosmos owner must include the control-plane contributor role."
  }
}
