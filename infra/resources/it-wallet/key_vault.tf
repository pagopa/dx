# # TODO
# resource "azurerm_key_vault" "psn_02" {
#   name                          = "${local.project}-kv-02"
#   location                      = azurerm_resource_group.ps_01.location
#   resource_group_name           = azurerm_resource_group.ps_01.name
#   tenant_id                     = data.azurerm_client_config.current.tenant_id
#   sku_name                      = "premium"
#   enabled_for_disk_encryption   = true
#   enable_rbac_authorization     = true
#   purge_protection_enabled      = true
#   public_network_access_enabled = true # evaluate
#   soft_delete_retention_days    = 7

#   network_acls {
#     bypass         = "AzureServices"
#     default_action = "Allow"
#   }

#   tags = local.tags
# }

# # TODO
# resource "azurerm_key_vault_key" "cosmos_key_01" {
#   name         = "${local.project}-cosno-key-01"
#   key_vault_id = azurerm_key_vault.psn_02.id
#   key_type     = "RSA"
#   key_size     = 3072

#   key_opts = [
#     "encrypt",
#     "decrypt",
#     "sign",
#     "verify",
#     "wrapKey",
#     "unwrapKey",
#   ]

#   rotation_policy {
#     automatic {
#       time_before_expiry = "P6M"
#     }

#     expire_after         = "P2Y"
#     notify_before_expiry = "P30D"
#   }

#   tags = local.tags
# }
