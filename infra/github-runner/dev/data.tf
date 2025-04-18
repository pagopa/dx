data "azurerm_resource_group" "gh_runner" {
  name = "${local.prefix}-${local.env_short}-${local.location_short}-github-runner-rg-${local.suffix}"
}

data "azurerm_container_app_environment" "gh_runner" {
  name                = "${local.prefix}-${local.env_short}-${local.location_short}-github-runner-cae-${local.suffix}"
  resource_group_name = data.azurerm_resource_group.gh_runner.name
}

data "azurerm_key_vault" "key_vault" {
  name                = "${local.prefix}-${local.env_short}-${local.location_short}-common-kv-${local.suffix}"
  resource_group_name = "${local.prefix}-${local.env_short}-${local.location_short}-common-rg-${local.suffix}"
}