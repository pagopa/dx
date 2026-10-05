# This data block retrieves information only about Azure Private DNS Zones
# regarding the subservices enabled by the user in var.subservices_enabled,
# when private endpoints are created (see local.create_private_endpoints,
# i.e. when subnet_pep_id and private_dns_zone_resource_group_name are set).
data "azurerm_private_dns_zone" "storage_account" {
  for_each            = { for subservice, status in local.peps.create_subservices : subservice => status if status == true }
  name                = local.peps[each.key].dns_zone
  resource_group_name = var.private_dns_zone_resource_group_name
}

data "azurerm_subscription" "current" {
}

data "azurerm_key_vault" "this" {
  for_each = (local.cmk_flags.kv ? toset(["kv"]) : toset([]))

  name                = split("/", var.customer_managed_key.key_vault_id)[8]
  resource_group_name = split("/", var.customer_managed_key.key_vault_id)[4]
}
