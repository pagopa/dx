resource "azurerm_container_app" "this" {
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
    min_replicas = local.sku.replicas.min
    max_replicas = local.sku.replicas.max

    dynamic "container" {
      for_each = var.container_app_templates
      content {
        # get the name from the image if not set according to formats: registry.name/org/name:sha-value - nginix:latest
        name   = container.value.name == "" ? split(":", split("/", container.value.image)[length(split("/", container.value.image)) - 1])[0] : container.value.name
        image  = container.value.image
        cpu    = local.sku.cpu
        memory = local.sku.memory

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

  tags = local.tags
}
