resource "azurerm_servicebus_namespace" "this" {
  name                = local.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  sku                 = local.sku_name

  local_auth_enabled           = false
  capacity                     = local.capacity
  premium_messaging_partitions = local.partitions

  public_network_access_enabled = false

  network_rule_set {
    public_network_access_enabled = false
    default_action                = local.default_action
    trusted_services_allowed      = true
    ip_rules                      = var.allowed_ips
  }

  minimum_tls_version = "1.2"

  tags = local.tags
}
