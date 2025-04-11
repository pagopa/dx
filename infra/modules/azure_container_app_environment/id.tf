resource "azurerm_user_assigned_identity" "cae_identity" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "${var.environment.app_name}-cae",
    resource_type = "managed_identity"
  }))
  location            = var.environment.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_management_lock" "identity_lock" {
  name       = azurerm_user_assigned_identity.cae_identity.name
  scope      = azurerm_user_assigned_identity.cae_identity.id
  lock_level = "CanNotDelete"

  notes = "Lock for the user-assigned managed identity"
}
