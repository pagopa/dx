# ACM validation records (CNAME)

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
    for dvo in aws_acm_certificate.api_custom_cdn.domain_validation_options : dvo.domain_name => {
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

# API Gateway custom domain CNAME

# Creates a CNAME record in Azure DNS pointing to CloudFront distribution.
# This routes traffic through CloudFront with WAF protection.
resource "azurerm_dns_cname_record" "cloudfront" {
  name                = trimsuffix(var.dns.custom_domain_name, ".${var.dns.zone_name}")
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = aws_cloudfront_distribution.mcp_server.domain_name
}
