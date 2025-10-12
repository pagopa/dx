resource "azurerm_container_app" "this" {
  count = local.is_function_app ? 0 : 1

  name                         = provider::dx::resource_name(merge(local.naming_config, { resource_type = "container_app" }))
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.revision_mode
  workload_profile_name        = "Consumption"

  identity {
    type = "SystemAssigned, UserAssigned"
    identity_ids = [
      var.user_assigned_identity_id
    ]
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = var.target_port
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  dynamic "registry" {
    for_each = var.acr_registry == null ? [] : [var.acr_registry]
    content {
      server   = registry.value
      identity = var.user_assigned_identity_id
    }
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name                = replace(lower(secret.value.name), "_", "-")
      key_vault_secret_id = secret.value.key_vault_secret_id
      identity            = var.user_assigned_identity_id
    }
  }

  template {
    termination_grace_period_seconds = 30

    min_replicas = local.replica_minimum
    max_replicas = local.replica_maximum

    dynamic "azure_queue_scale_rule" {
      for_each = try(var.autoscaler.azure_queue_scalers, [])
      content {
        name         = azure_queue_scale_rule.value.queue_name
        queue_name   = azure_queue_scale_rule.value.queue_name
        queue_length = azure_queue_scale_rule.value.queue_length

        authentication {
          secret_name       = replace(lower(azure_queue_scale_rule.value.authentication.secret_name), "_", "-")
          trigger_parameter = azure_queue_scale_rule.value.authentication.trigger_parameter
        }
      }
    }

    dynamic "http_scale_rule" {
      for_each = try(var.autoscaler.http_scalers, [])
      content {
        name                = http_scale_rule.value.name
        concurrent_requests = http_scale_rule.value.concurrent_requests
      }
    }

    dynamic "custom_scale_rule" {
      for_each = try(var.autoscaler.custom_scalers, [])
      content {
        name             = custom_scale_rule.value.name
        custom_rule_type = custom_scale_rule.value.custom_rule_type
        metadata         = custom_scale_rule.value.metadata

        dynamic "authentication" {
          for_each = custom_scale_rule.value.authentication == null ? [] : [custom_scale_rule.value.authentication]

          content {
            secret_name       = replace(lower(authentication.value.secret_name), "_", "-")
            trigger_parameter = authentication.value.trigger_parameter
          }
        }
      }
    }

    dynamic "container" {
      for_each = var.container_app_templates
      content {
        # get the name from the image if not set according to formats: registry.name/org/name:sha-value - nginix:latest
        name   = container.value.name == "" ? split(":", split("/", container.value.image)[length(split("/", container.value.image)) - 1])[0] : container.value.name
        image  = container.value.image
        cpu    = local.cpu_size
        memory = local.memory_size

        dynamic "env" {
          for_each = container.value.app_settings

          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = var.secrets

          content {
            name        = env.value.name
            secret_name = replace(lower(env.value.name), "_", "-")
          }
        }

        dynamic "liveness_probe" {
          for_each = container.value.liveness_probe == null ? [] : [container.value.liveness_probe]

          content {
            port                    = var.target_port
            transport               = liveness_probe.value.transport
            failure_count_threshold = liveness_probe.value.failure_count_threshold
            initial_delay           = liveness_probe.value.initial_delay
            interval_seconds        = liveness_probe.value.interval_seconds
            path                    = liveness_probe.value.path
            timeout                 = liveness_probe.value.timeout

            dynamic "header" {
              for_each = liveness_probe.value.header == null ? [] : [liveness_probe.value.header]

              content {
                name  = header.value.name
                value = header.value.value
              }
            }
          }
        }

        dynamic "readiness_probe" {
          for_each = container.value.readiness_probe == null ? [] : [container.value.readiness_probe]

          content {
            port                    = var.target_port
            transport               = readiness_probe.value.transport
            failure_count_threshold = readiness_probe.value.failure_count_threshold
            interval_seconds        = readiness_probe.value.interval_seconds
            initial_delay           = readiness_probe.value.initial_delay
            path                    = readiness_probe.value.path
            success_count_threshold = readiness_probe.value.success_count_threshold
            timeout                 = readiness_probe.value.timeout

            dynamic "header" {
              for_each = readiness_probe.value.header == null ? [] : [readiness_probe.value.header]

              content {
                name  = header.value.name
                value = header.value.value
              }
            }
          }
        }

        dynamic "startup_probe" {
          for_each = container.value.startup_probe == null ? [] : [container.value.startup_probe]

          content {
            port                    = var.target_port
            transport               = startup_probe.value.transport
            failure_count_threshold = startup_probe.value.failure_count_threshold
            interval_seconds        = startup_probe.value.interval_seconds
            path                    = startup_probe.value.path
            timeout                 = startup_probe.value.timeout

            dynamic "header" {
              for_each = startup_probe.value.header == null ? [] : [startup_probe.value.header]

              content {
                name  = header.value.name
                value = header.value.name
              }
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      # The image is not managed by Terraform, but instead updated by CD pipelines
      template[0].container[0].image
    ]
  }

  tags = local.tags
}

resource "azapi_resource" "this" {
  count = local.is_function_app ? 1 : 0

  type      = "Microsoft.App/containerApps@2025-07-01"
  name      = local.function_app.name
  parent_id = local.resource_group_id
  location  = var.environment.location

  identity {
    type = "SystemAssigned, UserAssigned"
    identity_ids = [
      var.user_assigned_identity_id
    ]
  }

  body = {
    kind = "functionapp"
    properties = {
      environmentId = var.container_app_environment_id
      configuration = {
        activeRevisionsMode = var.revision_mode

        ingress = {
          allowInsecure = false
          external      = true
          targetPort    = var.target_port
          traffic = [
            {
              weight         = 100
              latestRevision = true
            }
          ]
        }

        secrets = [
          for secret in var.secrets : {
            name        = replace(lower(secret.name), "_", "-")
            keyVaultUrl = secret.key_vault_secret_id
            identity    = var.user_assigned_identity_id
          }
        ]
      }

      template = {
        terminationGracePeriodSeconds = 30
        scale = {
          pollingInterval = 30
          cooldownPeriod  = 300
          minReplicas     = local.replica_minimum
          maxReplicas     = local.replica_maximum

          rules = [
            {
              name = var.autoscaler.http_scalers[0].name,
              http = {
                metadata = {
                  concurrentRequests = tostring(var.autoscaler.http_scalers[0].concurrent_requests)
                }
              }
            }
          ]
        }

        containers = [
          for container in var.container_app_templates : {
            # get the name from the image if not set according to formats: registry.name/org/name:sha-value - nginix:latest
            name  = container.name == "" ? split(":", split("/", container.image)[length(split("/", container.image)) - 1])[0] : container.name
            image = container.image
            resources = {
              cpu    = local.sku.cpu    # local.ca_sku_name_mapping.cpu[local.tier]
              memory = local.sku.memory # local.ca_sku_name_mapping.memory[local.tier]
            }

            env = concat(
              [
                for name, value in merge(
                  {
                    # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#functions_worker_process_count
                    FUNCTIONS_WORKER_PROCESS_COUNT = local.sku.worker_process_count

                    AzureWebJobsStorage__accountName = azurerm_storage_account.this[0].name,
                    AzureWebJobsStorage__credential  = "managedidentity",

                    # https://techcommunity.microsoft.com/blog/appsonazureblog/how-to-store-function-apps-function-keys-in-a-key-vault/2639181
                    AzureWebJobsSecretStorageType        = "keyvault",
                    AzureWebJobsSecretStorageKeyVaultUri = "https://${var.function_settings.key_vault_name}.vault.azure.net",
                  },
                  # https://learn.microsoft.com/en-us/azure/azure-functions/errors-diagnostics/diagnostic-events/azfd0004#options-for-addressing-collisions
                  length(local.function_app.name) > 32 && !(contains(keys(container.app_settings), "AzureFunctionsWebHost__hostid")) ? { AzureFunctionsWebHost__hostid = "production" } : {},
                  container.app_settings,
                  local.application_insights.enable ? {
                    APPLICATIONINSIGHTS_CONNECTION_STRING = var.function_settings.application_insights_connection_string,

                    # AI SDK Sampling, to be used programmatically
                    # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
                    APPINSIGHTS_SAMPLING_PERCENTAGE = var.function_settings.application_insights_sampling_percentage,

                    # Azure Function Host (runtime) AI Sampling
                    # https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring?tabs=v2#overriding-monitoring-configuration-at-runtime
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__minSamplingPercentage     = var.function_settings.application_insights_sampling_percentage,
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__maxSamplingPercentage     = var.function_settings.application_insights_sampling_percentage,
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__initialSamplingPercentage = var.function_settings.application_insights_sampling_percentage
                  } : {},
                  ) : {
                  name  = name
                  value = value
                }
              ],
              [
                for secret in var.secrets : {
                  name      = secret.name
                  secretRef = replace(lower(secret.name), "_", "-")
                }
              ]
            )

            probes = [
              for probe in concat(
                [
                  container.readiness_probe != null ? {
                    type = "Readiness"
                    httpGet = {
                      path   = container.readiness_probe.path
                      port   = var.target_port
                      scheme = container.readiness_probe.transport
                      httpHeaders = container.readiness_probe.header != null ? [
                        {
                          name  = container.readiness_probe.header.name
                          value = container.readiness_probe.header.value
                        }
                      ] : []
                    }
                    initialDelaySeconds = container.readiness_probe.initial_delay
                    timeoutSeconds      = container.readiness_probe.timeout
                    successThreshold    = container.readiness_probe.success_count_threshold
                    failureThreshold    = container.readiness_probe.failure_count_threshold
                  } : null
                ],
                [
                  {
                    type = "Liveness"
                    httpGet = {
                      path   = container.liveness_probe.path
                      port   = var.target_port
                      scheme = container.liveness_probe.transport
                      httpHeaders = container.liveness_probe.header != null ? [
                        {
                          name  = container.liveness_probe.header.name
                          value = container.liveness_probe.header.value
                        }
                      ] : []
                    }
                    initialDelaySeconds = container.liveness_probe.initial_delay
                    timeoutSeconds      = container.liveness_probe.timeout
                    failureThreshold    = container.liveness_probe.failure_count_threshold
                  }
                ],
                [
                  container.startup_probe != null ? {
                    type = "Startup"
                    httpGet = {
                      path   = container.startup_probe.path
                      port   = var.target_port
                      scheme = container.startup_probe.transport
                      httpHeaders = container.startup_probe.header != null ? [
                        {
                          name  = container.startup_probe.header.name
                          value = container.startup_probe.header.value
                        }
                      ] : []
                    }
                    timeoutSeconds   = container.startup_probe.timeout
                    failureThreshold = container.startup_probe.failure_count_threshold
                  } : null
                ]
              ) : probe if probe != null
            ]
          }
        ]
      }
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      # The image is not managed by Terraform, but instead updated by CD pipelines
      body.properties.template.containers[0].image
    ]
  }

  schema_validation_enabled = false
  response_export_values    = ["*"]

  depends_on = [
    azurerm_private_endpoint.st_blob,
    azurerm_private_endpoint.st_file,
    azurerm_private_endpoint.st_queue,
  ]
}
