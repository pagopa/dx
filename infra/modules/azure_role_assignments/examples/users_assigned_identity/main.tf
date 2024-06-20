resource "azurerm_user_assigned_identity" "id" {
  location            = data.azurerm_resource_group.dx_identity.location
  resource_group_name = data.azurerm_resource_group.dx_identity.name
  name                = "${local.project}-id-${local.environment.instance_number}"
}


module "roles" {
  source       = "../../"
  principal_id = azurerm_user_assigned_identity.id.principal_id

  storage_account
}