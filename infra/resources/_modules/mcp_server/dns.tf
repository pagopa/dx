# ACM validation records (CNAME)
resource "azurerm_dns_cname_record" "acm_validation" {
  for_each = { for dvo in tolist(aws_acm_certificate.api_custom_domain.domain_validation_options) : dvo.resource_record_name => dvo }

  name                = each.value.resource_record_name
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = each.value.resource_record_value
}

# API Gateway custom domain CNAME
resource "azurerm_dns_cname_record" "api_gateway_custom" {
  name                = var.dns.custom_domain_name
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = aws_apigatewayv2_domain_name.api_custom.domain_name_configuration[0].target_domain_name
}
