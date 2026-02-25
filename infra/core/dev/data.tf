data "azurerm_client_config" "current" {}

data "azuread_group" "admin_group" {
  display_name = "${local.azure_environment.prefix}-${local.azure_environment.env_short}-adgroup-admin"
}

data "azuread_users" "admin_members" {
  object_ids = data.azuread_group.admin_group.members
}

data "azurerm_private_dns_zone" "postgres" {
  name                = one([for zone in module.azure.private_dns_zones : zone if can(regex("postgres.database", zone))])
  resource_group_name = module.azure.network_resource_group_name
}

data "azurerm_private_dns_zone" "cae" {
  name                = one([for zone in module.azure.private_dns_zones : zone if can(regex("${local.azure_environment.location}.azurecontainerapps", zone))])
  resource_group_name = module.azure.network_resource_group_name
}
