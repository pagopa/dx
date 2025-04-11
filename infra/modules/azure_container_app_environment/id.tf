resource "azurerm_user_assigned_identity" "cae_identity" {
  name                = provider::dx::resource_name(merge(local.naming_config, { domain = "com", name = "cae", resource_type = "managed_identity" }))
  location            = var.environment.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}
