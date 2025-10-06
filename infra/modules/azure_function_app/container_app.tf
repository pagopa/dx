resource "azapi_resource" "this" {
  count = local.use_container_app ? 1 : 0

  type      = "Microsoft.App/containerApps@2025-02-02-preview"
  parent_id = local.resource_group_id
  name      = local.container_app.name
  location  = var.environment.location

  identity {
    type = "SystemAssigned, UserAssigned"
    identity_ids = [
      var.container_app_config.user_assigned_identity_id
    ]
  }

  body = {
    kind = "functionapp"
    properties = {
      environmentId = var.container_app_config.environment_id
      configuration = {
        activeRevisionsMode = var.container_app_config.active_revisions_mode

        ingress = {
          allowInsecure = false
          external      = true
          targetPort    = var.container_app_config.target_port
          traffic = [
            {
              weight         = 100
              latestRevision = true
            }
          ]
        }

        secrets = [
          for secret in var.container_app_config.secrets : {
            name        = replace(lower(secret.name), "_", "-")
            keyVaultUrl = secret.key_vault_secret_id
            identity    = var.container_app_config.user_assigned_identity_id
          }
        ]
      }

      template = {
        terminationGracePeriodSeconds = 30
        scale = {
          minReplicas = var.container_app_config.min_replicas
          maxReplicas = var.container_app_config.max_replicas
        }
        containers = [
          {
            # get the name from the image if not set according to formats: registry.name/org/name:sha-value - nginix:latest
            name  = var.container_app_config.name == "" ? split(":", split("/", var.container_app_config.image)[length(split("/", var.container_app_config.image)) - 1])[0] : var.container_app_config.name
            image = var.container_app_config.image
            resources = {
              cpu    = local.ca_sku_name_mapping.cpu[local.tier]
              memory = local.ca_sku_name_mapping.memory[local.tier]
            }

            env = concat(
              [
                for name, value in merge(
                  {
                    # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#functions_worker_process_count
                    # FUNCTIONS_WORKER_PROCESS_COUNT = local.function_app.worker_process_count,
                    # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
                    WEBSITE_DNS_SERVER               = "168.63.129.16",
                    AzureWebJobsStorage__accountName = azurerm_storage_account.this.name,

                    # https://techcommunity.microsoft.com/blog/appsonazureblog/how-to-store-function-apps-function-keys-in-a-key-vault/2639181
                    AzureWebJobsSecretStorageType        = "keyvault",
                    AzureWebJobsSecretStorageKeyVaultUri = "https://${local.key_vault.name}.vault.azure.net",

                    # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#functions_extension_version
                    FUNCTIONS_EXTENSION_VERSION = "~4"
                  },
                  # https://learn.microsoft.com/en-us/azure/azure-functions/errors-diagnostics/diagnostic-events/azfd0004#options-for-addressing-collisions
                  length(local.function_app.name) > 32 && !(contains(keys(var.app_settings), "AzureFunctionsWebHost__hostid")) ? { AzureFunctionsWebHost__hostid = "production" } : {},
                  var.app_settings,
                  local.application_insights.enable ? {
                    APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string,

                    # AI SDK Sampling, to be used programmatically
                    # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
                    APPINSIGHTS_SAMPLING_PERCENTAGE = var.application_insights_sampling_percentage,

                    # Azure Function Host (runtime) AI Sampling
                    # https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring?tabs=v2#overriding-monitoring-configuration-at-runtime
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__minSamplingPercentage     = var.application_insights_sampling_percentage,
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__maxSamplingPercentage     = var.application_insights_sampling_percentage,
                    AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__initialSamplingPercentage = var.application_insights_sampling_percentage
                  } : {},
                  ) : {
                  name  = name
                  value = value
                }
              ],
              [
                for secret in var.container_app_config.secrets : {
                  name      = secret.name
                  secretRef = replace(lower(secret.name), "_", "-")
                }
              ]
            )

            probes = [
              {
                type = "Readiness"
                httpGet = {
                  path = var.health_check_path
                  port = var.container_app_config.target_port
                }
                initialDelaySeconds = 30
                timeoutSeconds      = 2
              },
              {
                type = "Liveness"
                httpGet = {
                  path = var.health_check_path
                  port = var.container_app_config.target_port
                }
                timeoutSeconds = 2
              },
              {
                type = "Startup"
                httpGet = {
                  path = var.health_check_path
                  port = var.container_app_config.target_port
                }
                initialDelaySeconds = 30
                timeoutSeconds      = 2
              }
            ]
          },
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
