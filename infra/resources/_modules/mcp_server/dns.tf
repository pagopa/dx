# ACM validation records (CNAME)

# Creates CNAME records in Azure DNS for ACM certificate validation.
resource "azurerm_dns_cname_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_custom.domain_validation_options : dvo.domain_name => {
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

# Creates CNAME records in Azure DNS for ACM certificate validation.
resource "azurerm_dns_cname_record" "acm_validation_auth" {
  for_each = {
    for dvo in aws_acm_certificate.cognito_custom.domain_validation_options : dvo.domain_name => {
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

# Creates a CNAME record in Azure DNS for the API Gateway custom domain.
resource "azurerm_dns_cname_record" "api_gateway_custom" {
  name                = trimsuffix(var.dns.custom_domain_name, ".${var.dns.zone_name}")
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = aws_apigatewayv2_domain_name.api_custom.domain_name_configuration[0].target_domain_name
}

# Cognito auth custom domain CNAME
resource "azurerm_dns_cname_record" "cognito_custom" {
  name                = trimsuffix("auth.${var.dns.custom_domain_name}", ".${var.dns.zone_name}")
  zone_name           = var.dns.zone_name
  resource_group_name = var.dns.resource_group_name
  ttl                 = 300
  record              = aws_cognito_user_pool_domain.custom.cloudfront_distribution
}
