data "azurerm_private_dns_zone" "storage_account" {
  for_each            = { for subservice, status in var.subservices_enabled : subservice => status if status == true }
  name                = local.peps[each.key].dns_zone
  resource_group_name = var.private_dns_zone_resource_group_name
}