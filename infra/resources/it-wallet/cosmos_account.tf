resource "azurerm_cosmosdb_account" "psn_01" {
  name                = "${local.project}-cosno-01"
  resource_group_name = azurerm_resource_group.ps_01.name
  location            = azurerm_resource_group.ps_01.location
  offer_type          = "Standard"

  # TODO
  default_identity_type = "UserAssignedIdentity=${azurerm_user_assigned_identity.cosno_01.id}&FederatedClientId=${data.azuread_application.psn_hsm_01.client_id}"
  managed_hsm_key_id    = "https://pagopat-managedhsm.managedhsm.azure.net/keys/mdb001prod" # azurerm_key_vault_key.cosmos_key_01.versionless_id

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.cosno_01.id]
  }

  consistency_policy {
    consistency_level = "Strong"
  }

  geo_location {
    location          = azurerm_resource_group.ps_01.location
    failover_priority = 0
    zone_redundant    = false
  }

  public_network_access_enabled     = false # evaluate
  is_virtual_network_filter_enabled = false

  backup {
    type = "Continuous"
  }

  tags = local.tags

  # TODO
  # depends_on = [
  #   azurerm_role_assignment.cosnos_kv_crypto
  # ]
}
