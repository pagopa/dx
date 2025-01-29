data "azurerm_private_dns_zone" "storage_account" {
  for_each            = toset(var.subservices_enabled)
  name                = local.peps[each.value].dns_zone
  resource_group_name = var.virtual_network.resource_group_name
}