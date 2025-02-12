resource "azurerm_container_app_environment" "this" {
  count = var.create_container_app_environment ? 1 : 0

  name                       = "${module.naming_convention.prefix}-cae-${module.naming_convention.suffix}"
  location                   = var.environment.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

resource "azurerm_container_app" "this" {
  name                         = "${module.naming_convention.prefix}-ca-${module.naming_convention.suffix}"
  container_app_environment_id = !var.create_container_app_environment ? var.container_app_environment_id : azurerm_container_app_environment.this[0].id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
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
      name   = var.container_app_template.name

      dynamic "env" {
        for_each = var.container_app_template.envs

        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  tags = var.tags
}