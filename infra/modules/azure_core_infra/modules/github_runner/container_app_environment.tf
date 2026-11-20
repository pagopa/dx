locals {
  cae_name = provider::dx::resource_name(merge(var.naming_config, {
    resource_type = "container_app_environment",
  }))
}

resource "azurerm_container_app_environment" "cae" {
  name                = local.cae_name
  location            = var.location
  resource_group_name = var.resource_group_name

  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id       = var.runner_snet
  zone_redundancy_enabled        = false
  internal_load_balancer_enabled = false
  public_network_access          = "Disabled"

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name, # Otherwise Terraform forces the recreation at every plan due to provider issue
    ]
  }

  tags = var.tags
}

resource "azurerm_management_lock" "lock_cae" {
  lock_level = "CanNotDelete"
  name       = local.cae_name
  notes      = "This Container App Environment cannot be deleted"
  scope      = azurerm_container_app_environment.cae.id
}
