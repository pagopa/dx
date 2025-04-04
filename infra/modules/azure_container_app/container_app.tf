resource "azurerm_container_app" "this" {
  name                         = "${module.naming_convention.prefix}-ca-${module.naming_convention.suffix}"
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.revision_mode
  workload_profile_name        = "Consumption"

  identity {
    type = "SystemAssigned"
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

  dynamic "secret" {
    for_each = var.secrets
    content {
      name                = nonsensitive(replace(lower(secret.value.name), "_", "-"))
      key_vault_secret_id = nonsensitive(secret.value.key_vault_secret_id)
      identity            = nonsensitive("System")
    }
  }

  template {
    min_replicas = local.sku.replicas.min
    max_replicas = local.sku.replicas.max

    dynamic "container" {
      for_each = var.container_app_templates
      content {

        cpu    = local.sku.cpu
        image  = container.value.image
        memory = local.sku.memory
        name   = container.value.name != "" ? container.value.name : container.value.image

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

  tags = var.tags
}
