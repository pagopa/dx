resource "azurerm_dns_cname_record" "stategraph" {
  name                = "stategraph"
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 60
  record              = "${azurerm_container_app.stategraph.name}.${azurerm_container_app_environment.stategraph.default_domain}"

  tags = var.tags
}

# https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-certificates?tabs=private-endpoint&pivots=azure-cli#add-a-custom-domain-and-certificate
resource "azurerm_dns_txt_record" "stategraph" {
  name                = "asuid.stategraph"
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 720
  record {
    value = azurerm_container_app.stategraph.custom_domain_verification_id
  }

  tags = var.tags
}
