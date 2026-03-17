# Data source for the Container App Environment private DNS zone
data "azurerm_private_dns_zone" "container_app" {
  name                = "privatelink.${var.environment.location}.azurecontainerapps.io"
  resource_group_name = var.private_dns_zone_resource_group_name
}
