resource "azurerm_container_app_environment" "this" {
  count = var.create_container_app_environment ? 1 : 0

  name                       = "${module.naming_convention.prefix}-cae-${module.naming_convention.suffix}"
  location                   = var.environment.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id       = var.subnet_id == null ? azurerm_subnet.this[0].id : var.subnet_id
  internal_load_balancer_enabled = true

  tags = var.tags
}

resource "azurerm_container_app" "this" {
  name                         = "${module.naming_convention.prefix}-ca-${module.naming_convention.suffix}"
  container_app_environment_id = !var.create_container_app_environment ? var.container_app_environment_id : azurerm_container_app_environment.this[0].id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  identity {
    type         = local.registry_identity_check ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = local.registry_identity_check ? [var.registry.identity_id] : []
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  dynamic "registry" {
    for_each = var.registry != null ? [1] : []

    content {
      server               = var.registry.server
      password_secret_name = var.registry.password_secret_name
      username             = var.registry.username
      identity             = var.registry.identity_id
    }
  }

  dynamic "secret" {
    for_each = var.key_vault != null ? [1] : []
    content {
      key_vault_secret_id = "${data.azurerm_key_vault.kv[0].vault_uri}secrets/${var.key_vault.secret_name}"

      identity = "System"
      name     = var.key_vault.secret_name
    }
  }

  template {
    min_replicas = local.sku.replicas.min
    max_replicas = local.sku.replicas.max

    container {
      cpu    = local.sku.cpu
      image  = var.container_app_template.image
      memory = local.sku.memory
      name   = var.container_app_template.name != "" ? var.container_app_template.name : var.container_app_template.image

      dynamic "env" {
        for_each = var.container_app_template.envs

        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "liveness_probe" {
        for_each = var.liveness_probe == null ? [] : [var.liveness_probe]

        content {
          port                    = liveness_probe.value.port
          transport               = liveness_probe.value.transport
          failure_count_threshold = liveness_probe.value.failure_count_threshold
          host                    = liveness_probe.value.host
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
        for_each = var.readiness_probe == null ? [] : [var.readiness_probe]

        content {
          port                    = readiness_probe.value.port
          transport               = readiness_probe.value.transport
          failure_count_threshold = readiness_probe.value.failure_count_threshold
          host                    = readiness_probe.value.host
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
        for_each = var.startup_probe == null ? [] : [var.startup_probe]

        content {
          port                    = startup_probe.value.port
          transport               = startup_probe.value.transport
          failure_count_threshold = startup_probe.value.failure_count_threshold
          host                    = startup_probe.value.host
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
  tags = var.tags
}