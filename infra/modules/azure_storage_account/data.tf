data "azurerm_private_dns_zone" "storage_account" {
  for_each = { for subservice, status in var.subservices : subservice => status if status == true}
  name                = local.peps[each.key].dns_zone
  resource_group_name = local.private_dns_zone.resource_group_name
}