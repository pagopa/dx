module "open_next" {
  source = "../../"

  providers = {
    aws           = aws
    aws.us-east-1 = aws.us-east-1
  }

  custom_domain = {
    domain_name         = local.dns_domain_name
    acm_certificate_arn = aws_acm_certificate.website.arn
    hosted_zone_id      = local.hosted_zone_id
  }

  environment = local.environment
  tags        = local.tags
}
