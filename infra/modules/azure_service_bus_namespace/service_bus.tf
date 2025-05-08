resource "azurerm_servicebus_namespace" "this" {
  name                = local.namespace.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  sku                 = local.namespace.sku_name

  capacity                     = var.capacity
  premium_messaging_partitions = 1

  local_auth_enabled = false

  network_rule_set {
    public_network_access_enabled = false
    default_action                = "Deny"
    trusted_services_allowed      = true
  }

  minimum_tls_version = "1.2"

  tags = local.tags
}
