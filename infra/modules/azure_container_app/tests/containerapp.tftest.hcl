provider "azurerm" {
  features {
  }
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

variables {
  environment = run.setup_tests.environment

  tags = run.setup_tests.tags

  use_case = "default"

  resource_group_name = run.setup_tests.resource_group_name

  container_app_environment_id = run.setup_tests.container_app_environment_id
  user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

  container_app_templates = [
    {
      image = "nginx:latest"

      app_settings = {
        "TEST1" = "value1",
        "TEST2" = "value2"
      }

      liveness_probe = {
        path = "/"
      }
    }
  ]

  secrets = [
    {
      name                = run.setup_tests.key_vault_secret1.name
      key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
    },
    {
      name                = run.setup_tests.key_vault_secret2.name
      key_vault_secret_id = run.setup_tests.key_vault_secret2.secret_id
    }
  ]
}

run "container_app_is_correct_plan" {
  command = plan

  variables {

  }

  assert {
    condition     = azurerm_container_app.this[0].name == "dx-d-itn-modules-test-ca-01"
    error_message = "The container app name is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].image == "nginx:latest"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].name == "nginx"
    error_message = "The container app container name auto-generated is wrong"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].termination_grace_period_seconds == 30
    error_message = "The container app termination grace period is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].min_replicas == 0
    error_message = "The container app minimum replicas is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].max_replicas == 1
    error_message = "The container app maximum replicas is not correct"
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this[0].template[0].container[0].env :
      env if env.secret_name == null
    ]) == 2 # number of settings set above
    error_message = "The number of variables in the container app is not correct"
  }

  assert {
    condition = length([
      for env in azurerm_container_app.this[0].template[0].container[0].env :
      env if env.secret_name != null
    ]) == 2 # number of secrets set above
    error_message = "The number of secrets set as variables in the container app is not correct"
  }

  assert {
    condition = alltrue([
      for secret in azurerm_container_app.this[0].secret : secret.name == lower(secret.name)
    ])
    error_message = "The container app secrets names are not correct"
  }

  assert {
    condition = alltrue([
      for secret in azurerm_container_app.this[0].secret : contains([
        run.setup_tests.key_vault_secret1.secret_id,
        run.setup_tests.key_vault_secret2.secret_id
        ],
      secret.key_vault_secret_id)
    ])
    error_message = "The container app secrets kv references are not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].liveness_probe[0].path == "/"
    error_message = "The container app liveness probe path is not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this[0].template[0].container[0].env : contains([
        "TEST1",
        "TEST2"
        ],
      env.name)
      if env.secret_name == null
    ])
    error_message = "The container app setting names are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this[0].template[0].container[0].env : contains([
        "value1",
        "value2"
        ],
      env.value)
      if env.secret_name == null
    ])
    error_message = "The container app setting values are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this[0].template[0].container[0].env : contains([
        run.setup_tests.key_vault_secret1.name,
        run.setup_tests.key_vault_secret2.name,
        ],
      env.name)
      if env.secret_name != null
    ])
    error_message = "The container app environment secret names are not correct"
  }

  assert {
    condition = alltrue([
      for env in azurerm_container_app.this[0].template[0].container[0].env : contains([
        replace(lower(run.setup_tests.key_vault_secret1.name), "_", "-"),
        replace(lower(run.setup_tests.key_vault_secret2.name), "_", "-"),
        ],
      env.secret_name)
      if env.secret_name != null
    ])
    error_message = "The container app environment secret values are not correct"
  }
}

run "container_app_correct_container_name" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "ghcr.io/pagopa/selfcare-dashboard-backend:sha-4b7f62d"

        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].image == "ghcr.io/pagopa/selfcare-dashboard-backend:sha-4b7f62d"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].name == "selfcare-dashboard-backend"
    error_message = "The container app container name auto-generated is wrong"
  }
}

run "container_app_correct_custom_container_name" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"

        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].image == "nginx:latest"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].container[0].name == "custom-nginx"
    error_message = "The container app container name auto-generated is wrong"
  }
}

run "container_app_correct_replicas" {
  command = plan

  variables {
    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }
    }
  }

  assert {
    condition     = length(azurerm_container_app.this[0].template[0].azure_queue_scale_rule) == 0
    error_message = "The container app should not have the Azure Queue Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this[0].template[0].http_scale_rule) == 0
    error_message = "The container app should not have the Http Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this[0].template[0].custom_scale_rule) == 0
    error_message = "The container app should not have the Custom Scale Rule configured"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "container_app_correct_custom_autoscaler" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"

        liveness_probe = {
          path = "/"
        }
      }
    ]

    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }

      custom_scalers = [
        {
          name             = "service-bus",
          custom_rule_type = "azure-servicebus",
          metadata = {
            queueName              = "queue-test",
            namespace              = "dx-d-itn-test-sbns-01"
            activationMessageCount = "2"
          }
        }
      ]
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      }
    ]
  }

  assert {
    condition     = length(azurerm_container_app.this[0].template[0].azure_queue_scale_rule) == 0
    error_message = "The container app should not have the Azure Queue Scale Rule configured"
  }

  assert {
    condition     = length(azurerm_container_app.this[0].template[0].http_scale_rule) == 0
    error_message = "The container app should not have the Http Scale Rule configured"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].name == "service-bus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].custom_rule_type == "azure-servicebus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["queueName"] == "queue-test"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["namespace"] == "dx-d-itn-test-sbns-01"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["activationMessageCount"] == "2"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "container_app_correct_autoscalers" {
  command = plan

  variables {
    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "custom-nginx"

        liveness_probe = {
          path = "/"
        }
      }
    ]

    autoscaler = {
      replicas = {
        minimum = 0
        maximum = 5
      }

      azure_queue_scalers = [
        {
          queue_name   = "test-queue",
          queue_length = 5
          authentication = {
            secret_name       = run.setup_tests.key_vault_secret1.name,
            trigger_parameter = run.setup_tests.key_vault_secret1.name
          }
        }
      ],
      http_scalers = [
        {
          name                = "test-http-scaler",
          concurrent_requests = 10,
        }
      ]
      custom_scalers = [
        {
          name             = "service-bus",
          custom_rule_type = "azure-servicebus",
          metadata = {
            queueName              = "queue-test",
            namespace              = "dx-d-itn-test-sbns-01"
            activationMessageCount = "2"
          }
        }
      ]
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].azure_queue_scale_rule[0].name == "test-queue"
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].azure_queue_scale_rule[0].queue_name == "test-queue"
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].azure_queue_scale_rule[0].queue_length == 5
    error_message = "The container app does not have the Azure Queue Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].http_scale_rule[0].name == "test-http-scaler"
    error_message = "The container app does not have the Http Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].http_scale_rule[0].concurrent_requests == "10"
    error_message = "The container app does not have the Http Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].name == "service-bus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].custom_rule_type == "azure-servicebus"
    error_message = "The container app does not have the Custom Scale Rule configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["queueName"] == "queue-test"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["namespace"] == "dx-d-itn-test-sbns-01"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].custom_scale_rule[0].metadata["activationMessageCount"] == "2"
    error_message = "The container app does not have the Custom Scale Rule metadata configured correctly"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].min_replicas == 0
    error_message = "The container app should have minimum replicas set to 0"
  }

  assert {
    condition     = azurerm_container_app.this[0].template[0].max_replicas == 5
    error_message = "The container app should have maximum replicas set to 5"
  }
}

run "no_function_app" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name

    container_app_environment_id = run.setup_tests.container_app_environment_id
    user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

    container_app_templates = [
      {
        image = "nginx:latest"

        liveness_probe = {
          path = "/"
        }
      }
    ]
  }

  assert {
    condition     = azurerm_container_app.this != null
    error_message = "Container App must be created"
  }

  assert {
    condition     = azapi_resource.this == []
    error_message = "No Azure Functions must be created"
  }

  assert {
    condition     = azurerm_storage_account.this == []
    error_message = "No Function's Storage Account must be created"
  }

  assert {
    condition     = azurerm_storage_account.durable_function == []
    error_message = "No Function's Storage Account must be created"
  }
}

run "function_app_azapi_resource_only" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name

    container_app_environment_id = run.setup_tests.container_app_environment_id
    user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

    container_app_templates = [
      {
        image = "mcr.microsoft.com/azure-functions/dotnet8-quickstart-demo:1.0"
        name  = "quickstart"

        app_settings = {
          key1 = "value1"
          key2 = "value2"
        }

        liveness_probe = {
          path = "/"
        }
      },
    ]

    function_settings = {
      key_vault_name                         = run.setup_tests.key_vault_name
      has_durable_functions                  = false
      subnet_pep_id                          = run.setup_tests.subnet_pep_id
      private_dns_zone_resource_group_id     = run.setup_tests.private_dns_zone_resource_group_id
      application_insights_connection_string = run.setup_tests.appi.connection_string
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      },
      {
        name                = run.setup_tests.key_vault_secret2.name
        key_vault_secret_id = run.setup_tests.key_vault_secret2.secret_id
      }
    ]
  }

  assert {
    condition     = length(azapi_resource.this) == 1
    error_message = "azapi_resource.this must be created"
  }
  assert {
    condition     = length(azurerm_container_app.this) == 0
    error_message = "azurerm_container_app.this must NOT be created"
  }
}

run "function_app_azapi_resource_properties" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name

    container_app_environment_id = run.setup_tests.container_app_environment_id
    user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

    container_app_templates = [
      {
        image = "mcr.microsoft.com/azure-functions/dotnet8-quickstart-demo:1.0"
        name  = "quickstart"

        app_settings = {
          key1 = "value1"
          key2 = "value2"
        }

        liveness_probe = {
          path = "/"
        }
      },
    ]

    function_settings = {
      key_vault_name                         = run.setup_tests.key_vault_name
      has_durable_functions                  = false
      subnet_pep_id                          = run.setup_tests.subnet_pep_id
      private_dns_zone_resource_group_id     = run.setup_tests.private_dns_zone_resource_group_id
      application_insights_connection_string = run.setup_tests.appi.connection_string
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      },
      {
        name                = run.setup_tests.key_vault_secret2.name
        key_vault_secret_id = run.setup_tests.key_vault_secret2.secret_id
      }
    ]
  }

  assert {
    condition = alltrue([
      for secret in azapi_resource.this[0].body.properties.configuration.secrets : contains([
        run.setup_tests.key_vault_secret1.secret_id,
        run.setup_tests.key_vault_secret2.secret_id
        ],
      secret.keyVaultUrl)
    ])
    error_message = "The container app secrets are not correct"
  }

  # assert {
  #   condition = alltrue([
  #     for secret in azapi_resource.this[0].body.properties.configuration.secrets : contains([
  #       run.setup_tests.key_vault_secret1.secret_id,
  #       run.setup_tests.key_vault_secret2.secret_id
  #       ],
  #     secret.key_vault_secret_id)
  #   ])
  #   error_message = "The container app secrets kv references are not correct"
  # }

  # assert {
  #   condition     = nonsensitive(azapi_resource.this[0].body.properties.template.containers[0].env[0].name) == "key1"
  #   error_message = "App setting name in azapi_resource is not correct"
  # }
  # assert {
  #   condition     = nonsensitive(azapi_resource.this[0].body.properties.template.containers[0].env[0].value) == "value1"
  #   error_message = "App setting value in azapi_resource is not correct"
  # }

  assert {
    condition     = azapi_resource.this[0].body.properties.configuration.activeRevisionsMode == "Multiple"
    error_message = "Revision mode in azapi_resource is not correct"
  }

  assert {
    condition     = azapi_resource.this[0].body.properties.template.containers[0].resources.cpu == 0.5
    error_message = "Worker process count (cpu) in azapi_resource is not correct"
  }

  assert {
    condition     = azapi_resource.this[0].body.properties.template.containers[0].resources.memory == "1Gi"
    error_message = "Worker process count (memory) in azapi_resource is not correct"
  }

  assert {
    condition     = azapi_resource.this[0].body.properties.configuration.secrets[0].identity == run.setup_tests.user_assigned_identity_id
    error_message = "Identity in azapi_resource secret is not correct"
  }

  assert {
    condition     = length(azurerm_storage_account.this) == 1
    error_message = "Storage account must be created"
  }
  assert {
    condition     = azurerm_storage_account.this[0].account_replication_type == "LRS"
    error_message = "Storage account replication type is not correct"
  }
  assert {
    condition     = azurerm_storage_account.this[0].account_kind == "StorageV2"
    error_message = "Storage account kind is not correct"
  }

  assert {
    condition     = length(azurerm_role_assignment.ca_storage_blob_data_owner) == 1
    error_message = "Role assignment for storage account blob must be created"
  }

  assert {
    condition     = length(azurerm_role_assignment.ca_storage_account_contributor) == 1
    error_message = "Role assignment for storage account must be created"
  }

  assert {
    condition     = length(azurerm_role_assignment.ca_storage_queue_data_contributor) == 1
    error_message = "Role assignment for storage account queue must be created"
  }

  assert {
    condition     = length(azurerm_private_endpoint.st_blob) == 1
    error_message = "Blob private endpoint must be created"
  }

  assert {
    condition     = length(azurerm_private_endpoint.st_file) == 1
    error_message = "File private endpoint must be created"
  }

  assert {
    condition     = length(azurerm_private_endpoint.st_queue) == 1
    error_message = "Queue private endpoint must be created"
  }
}

run "function_app_has_durable_functions" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name

    container_app_environment_id = run.setup_tests.container_app_environment_id
    user_assigned_identity_id    = run.setup_tests.user_assigned_identity_id

    container_app_templates = [
      {
        image = "mcr.microsoft.com/azure-functions/dotnet8-quickstart-demo:1.0"
        name  = "quickstart"

        app_settings = {
          key1 = "value1"
          key2 = "value2"
        }

        liveness_probe = {
          path = "/"
        }
      },
    ]

    function_settings = {
      key_vault_name                         = run.setup_tests.key_vault_name
      has_durable_functions                  = true
      subnet_pep_id                          = run.setup_tests.subnet_pep_id
      private_dns_zone_resource_group_id     = run.setup_tests.private_dns_zone_resource_group_id
      application_insights_connection_string = run.setup_tests.appi.connection_string
    }

    secrets = [
      {
        name                = run.setup_tests.key_vault_secret1.name
        key_vault_secret_id = run.setup_tests.key_vault_secret1.secret_id
      },
      {
        name                = run.setup_tests.key_vault_secret2.name
        key_vault_secret_id = run.setup_tests.key_vault_secret2.secret_id
      }
    ]
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 1
    error_message = "Durable function storage account must be created when has_durable_functions is true"
  }
  assert {
    condition     = length(azurerm_private_endpoint.std_blob) == 1
    error_message = "Durable blob private endpoint must be created when has_durable_functions is true"
  }
  assert {
    condition     = length(azurerm_private_endpoint.std_file) == 1
    error_message = "Durable file private endpoint must be created when has_durable_functions is true"
  }
  assert {
    condition     = length(azurerm_private_endpoint.std_queue) == 1
    error_message = "Durable queue private endpoint must be created when has_durable_functions is true"
  }
  assert {
    condition     = length(azurerm_private_endpoint.std_table) == 1
    error_message = "Durable table private endpoint must be created when has_durable_functions is true"
  }
}
