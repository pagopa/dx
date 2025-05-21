resource "aws_route53_record" "www_website" {
  zone_id = var.custom_domain.hosted_zone_id
  name    = "www.${var.custom_domain.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.distribution.domain_name
    zone_id                = aws_cloudfront_distribution.distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "website" {
  zone_id = var.custom_domain.hosted_zone_id
  name    = var.custom_domain.domain_name
  type    = "A"

  alias {
    name                   = aws_route53_record.www_website.name
    zone_id                = aws_route53_record.www_website.zone_id
    evaluate_target_health = false
  }
}
