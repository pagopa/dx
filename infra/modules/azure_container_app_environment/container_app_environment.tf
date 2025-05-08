resource "azurerm_container_app_environment" "this" {
  name                       = provider::dx::resource_name(merge(local.naming_config, { resource_type = "container_app_environment" }))
  location                   = var.environment.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id       = var.subnet_id == null ? azurerm_subnet.this[0].id : var.subnet_id
  internal_load_balancer_enabled = true

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
    minimum_count         = 1
    maximum_count         = 1
  }

  zone_redundancy_enabled = var.environment.env_short != "d" ? true : false

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
      workload_profile,
    ]
  }

  timeouts {
    create = "60m"
  }

  tags = local.tags
}

resource "azurerm_management_lock" "cae_lock" {
  name       = azurerm_container_app_environment.this.name
  scope      = azurerm_container_app_environment.this.id
  lock_level = "CanNotDelete"

  notes = "Lock for the Container App Environment"
}
