module "open_next" {
  source = "../../"

  custom_domain = {
    domain_name         = local.dns_domain_name
    acm_certificate_arn = aws_acm_certificate.website.arn
    hosted_zone_id      = local.hosted_zone_id
  }

  are_previews_enabled = true

  environment = local.environment
  tags        = local.tags
}
