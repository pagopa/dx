#tfsec:ignore:AVD-AZU-0013
resource "azurerm_key_vault" "common" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "common",
      domain        = "",
      resource_type = "key_vault",
  }))
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  sku_name            = "standard"

  enabled_for_disk_encryption = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 7
  enable_rbac_authorization   = true

  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow" #tfsec:ignore:AZU020
  }

  tags = var.tags
}
