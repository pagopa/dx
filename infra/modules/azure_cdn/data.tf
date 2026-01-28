data "azurerm_client_config" "current" {}

data "azurerm_cdn_frontdoor_profile" "existing" {
  count = var.existing_cdn_frontdoor_profile_id != null ? 1 : 0

  name                = local.existing_cdn_frontdoor_profile_match["resource_name"]
  resource_group_name = local.existing_cdn_frontdoor_profile_match["resource_group_name"]
}
