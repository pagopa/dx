resource "azurerm_resource_group" "main" {
  name     = local.resource_group.name
  location = local.resource_group.location

  tags = local.tags

  lifecycle {
    precondition {
      condition = var.terraform_state_container_access == null || alltrue([
        for id in concat(
          ["${data.azurerm_subscription.current.id}/resourceGroups/${local.resource_group.name}"],
          tolist(var.additional_resource_group_ids),
          [var.opex_resource_group_id, var.private_dns_zone_resource_group_id]
        ) : provider::azurerm::normalise_resource_id(id) != local.terraform_state_resource_group_id
      ])
      error_message = "Container state mode requires the state account resource group to be separate from every resource group receiving module grants."
    }
  }
}
