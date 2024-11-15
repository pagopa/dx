#tfsec:ignore:AVD-AZU-0013
resource "azurerm_key_vault" "common" {
  name                = "${var.project}-common-kv-01"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = local.tenant_id
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
