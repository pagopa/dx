data "azurerm_resource_group" "dx_identity" {
  name = "${local.environment.prefix}-${local.environment.env_short}-identity-rg"
}

data "azurerm_subscription" "current" {}
