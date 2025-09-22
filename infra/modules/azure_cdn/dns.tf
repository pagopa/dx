
# Create a DNS CNAME record if the custom domain is not an apex domain and has a DNS zone configured.
resource "azurerm_dns_cname_record" "this" {
  for_each            = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain if custom_domain.dns.zone_name != null && custom_domain.dns.zone_resource_group_name != null && !lookup(local.is_apex, custom_domain.host_name, false) }
  name                = trimsuffix(each.value.host_name, ".${each.value.dns.zone_name}")
  zone_name           = each.value.dns.zone_name
  resource_group_name = each.value.dns.zone_resource_group_name
  ttl                 = 3600
  target_resource_id  = azurerm_cdn_frontdoor_endpoint.this.id
  tags                = local.tags
}

# Create a DNS A record for apex domains (root domains) that have a DNS zone configured.
resource "azurerm_dns_a_record" "this" {
  for_each            = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain if custom_domain.dns.zone_name != null && custom_domain.dns.zone_resource_group_name != null && lookup(local.is_apex, custom_domain.host_name, false) }
  name                = "@"
  zone_name           = each.value.dns.zone_name
  resource_group_name = each.value.dns.zone_resource_group_name
  ttl                 = 3600
  target_resource_id  = azurerm_cdn_frontdoor_endpoint.this.id
  tags                = local.tags
}

# Create a DNS TXT record for each custom domain publicly exposed via DNS.
# This record is used to validate the custom domain and allow the CDN to serve content for it.
resource "azurerm_dns_txt_record" "validation" {
  for_each            = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain if custom_domain.dns.zone_name != null && custom_domain.dns.zone_resource_group_name != null }
  name                = each.value.host_name == each.value.dns.zone_name ? "_dnsauth" : format("_dnsauth.%s", trimsuffix(each.value.host_name, ".${each.value.dns.zone_name}"))
  zone_name           = each.value.dns.zone_name
  resource_group_name = each.value.dns.zone_resource_group_name
  ttl                 = "3600"
  record {
    value = azurerm_cdn_frontdoor_custom_domain.this[each.key].validation_token
  }
  tags = merge(local.tags, {
    Origin = each.value.host_name
    Cdn    = azurerm_cdn_frontdoor_profile.this.name
  })
}
