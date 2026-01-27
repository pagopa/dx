data "azurerm_client_config" "current" {}

data "azurerm_cdn_frontdoor_profile" "existing" {
  count = var.existing_cdn_frontdoor_profile_id != null ? 1 : 0

  name                = split("/", var.existing_cdn_frontdoor_profile_id)[8]
  resource_group_name = split("/", var.existing_cdn_frontdoor_profile_id)[4]
}
