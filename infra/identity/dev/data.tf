data "azurerm_key_vault" "common" {
  name                = "${local.project}-${local.location_short}-common-kv-01"
  resource_group_name = "${local.project}-${local.location_short}-common-rg-01"
}