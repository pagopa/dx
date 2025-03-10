resource "azurerm_private_dns_a_record" "this" {
  name                = replace(azurerm_container_app.this.ingress[0].fqdn, ".azurecontainerapps.io", "")
  resource_group_name = data.azurerm_private_dns_zone.this.resource_group_name
  zone_name           = data.azurerm_private_dns_zone.this.name
  ttl                 = 3600
  records             = concat(azurerm_container_app.this.outbound_ip_addresses, [var.container_app_environment.private_endpoint_ip])

  tags = var.tags
}