data "azurerm_private_dns_zone" "this" {
  name                = "azurecontainerapps.io"
  resource_group_name = var.container_app_environment.private_dns_zone_resource_group_name
}
