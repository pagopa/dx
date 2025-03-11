resource "aws_amplify_domain_association" "this" {
  for_each               = var.custom_domain != null ? toset([var.custom_domain.name]) : []
  app_id                 = aws_amplify_app.this.id
  domain_name            = var.custom_domain.name
  enable_auto_sub_domain = true

  sub_domain {
    branch_name = aws_amplify_branch.this.branch_name
    prefix      = ""
  }

  dynamic "sub_domain" {
    for_each = toset(var.custom_domain.sub_domains)
    content {
      branch_name = aws_amplify_branch.this.branch_name
      prefix      = sub_domain.value
    }
  }
}

resource "aws_route53_record" "naked_domain" {
  for_each = var.custom_domain != null ? toset([var.custom_domain.name]) : []
  zone_id  = var.custom_domain.zone_id
  name     = var.custom_domain.name
  type     = "A"
  ttl      = "3600"
  records  = [aws_amplify_domain_association.this[var.custom_domain.name].domain_association_dns_name]
}

resource "aws_route53_record" "sub_domains" {
  for_each = var.custom_domain != null ? toset(var.custom_domain.sub_domains) : []
  zone_id  = var.custom_domain.zone_id
  name     = "${each.value}.${var.custom_domain.name}"
  type     = "A"
  ttl      = "3600"
  records  = [aws_amplify_domain_association.this[var.custom_domain.name].domain_association_dns_name]

}

# validate amplify certificate
resource "aws_route53_record" "certificate" {
  for_each = var.custom_domain != null ? toset([var.custom_domain.name]) : []
  zone_id  = var.custom_domain.zone_id
  name     = split(" ", aws_amplify_domain_association.this[var.custom_domain.name].certificate_verification_dns_record)[0]
  type     = "CNAME"
  ttl      = "3600"
  records  = [split(" ", aws_amplify_domain_association.this[var.custom_domain.name].certificate_verification_dns_record)[2]]

}