resource "azurerm_static_web_app_custom_domain" "this" {
  static_web_app_id = azurerm_static_web_app.this.id
  domain_name       = "dx.pagopa.it"
  validation_type   = "dns-txt-token"
}

resource "azurerm_dns_txt_record" "validation" {
  name                = "_dnsauth.dx.pagopa.it"
  zone_name           = "dx.pagopa.it"
  resource_group_name = var.network_resource_group_name
  ttl                 = 300

  record {
    value = azurerm_static_web_app_custom_domain.this.validation_token == "" ? "validated" : azurerm_static_web_app_custom_domain.this.validation_token
  }
}

resource "azurerm_dns_a_record" "custom_domain" {
  name                = "@"
  zone_name           = "dx.pagopa.it"
  resource_group_name = var.network_resource_group_name
  ttl                 = 300
  target_resource_id  = azurerm_static_web_app.this.id
}
