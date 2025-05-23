resource "aws_acm_certificate" "website" {
  domain_name               = "*.${local.dns_domain_name}"
  validation_method         = "DNS"

  subject_alternative_names = [local.dns_domain_name]

  lifecycle {
    create_before_destroy = true
  }

  # TLS certificate generated in us-east because it is related to the CDN which is a global resource
  provider = aws.us-east-1
}

resource "aws_route53_record" "certificate" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 3600 # 1 hour
  type            = each.value.type
  zone_id         = local.hosted_zone_id
}
