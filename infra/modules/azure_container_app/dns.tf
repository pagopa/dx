# Create a DNS CNAME record pointing the custom domain to the container app FQDN.
# Required for Azure to validate and serve traffic for the custom domain.
resource "azurerm_dns_cname_record" "this" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null ? 1 : 0

  name                = trimsuffix(var.custom_domain.host_name, ".${var.custom_domain.dns.zone_name}")
  zone_name           = var.custom_domain.dns.zone_name
  resource_group_name = var.custom_domain.dns.zone_resource_group_name
  ttl                 = 3600
  record              = azurerm_container_app.this.ingress[0].fqdn

  tags = local.tags
}

# Create a DNS TXT record used by Azure to verify ownership of the custom domain.
# The record name follows the asuid.<subdomain> convention required by Azure Container Apps.
resource "azurerm_dns_txt_record" "validation" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null ? 1 : 0

  name                = "asuid.${trimsuffix(var.custom_domain.host_name, ".${var.custom_domain.dns.zone_name}")}"
  zone_name           = var.custom_domain.dns.zone_name
  resource_group_name = var.custom_domain.dns.zone_resource_group_name
  ttl                 = 3600

  record {
    value = azurerm_container_app.this.custom_domain_verification_id
  }

  tags = local.tags
}

# Wait for DNS propagation before Azure attempts to validate the custom domain.
# Without this delay, Azure may fail to find the TXT record immediately after creation.
resource "time_sleep" "dns_propagation" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null ? 1 : 0

  depends_on = [
    azurerm_dns_cname_record.this,
    azurerm_dns_txt_record.validation,
  ]

  create_duration = "60s"
}
