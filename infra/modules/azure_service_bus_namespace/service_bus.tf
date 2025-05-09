resource "azurerm_servicebus_namespace" "this" {
  name                = local.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  sku                 = local.sku_name

  local_auth_enabled = false

  network_rule_set {
    public_network_access_enabled = false
    default_action                = "Deny"
    trusted_services_allowed      = true
  }

  minimum_tls_version = "1.2"

  tags = local.tags
}
