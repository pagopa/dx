# Creates CNAME records in Azure DNS for ACM certificate validation.
# resource "azurerm_dns_cname_record" "acm_validation" {
#   for_each = {
#     for dvo in aws_acm_certificate.api_custom.domain_validation_options : dvo.domain_name => {
#       name   = dvo.resource_record_name
#       record = dvo.resource_record_value
#     }
#   }

#   name                = trimsuffix(trimsuffix(each.value.name, "."), ".${var.dns.zone_name}")
#   zone_name           = var.dns.zone_name
#   resource_group_name = var.dns.resource_group_name
#   ttl                 = 300
#   record              = each.value.record
# }

# Creates CNAME records in Azure DNS for ACM certificate validation in US East 1.
resource "azurerm_dns_cname_record" "acm_cdn_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_custom_domain.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
    }
  }

  name                = trimsuffix(trimsuffix(each.value.name, "."), ".${var.dns.zone_name}")
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = each.value.record
}

# Creates a CNAME record in Azure DNS pointing to API Gateway custom domain.
resource "azurerm_dns_cname_record" "api_gateway" {
  name                = trimsuffix(var.dns.custom_domain_name, ".${var.dns.zone_name}")
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = aws_api_gateway_domain_name.mcp_server.regional_domain_name
}
