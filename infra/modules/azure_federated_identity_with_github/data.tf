data "azurerm_resource_group" "ci_details" {
  for_each = var.continuos_integration.roles == null ? {} : var.continuos_integration.roles.resource_groups

  name = each.key
}

data "azurerm_resource_group" "cd_details" {
  for_each = var.continuos_delivery.roles == null ? {} : var.continuos_delivery.roles.resource_groups

  name = each.key
}
