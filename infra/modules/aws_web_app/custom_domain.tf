resource "aws_amplify_domain_association" "this" {
  for_each               = local.create_custom_domain
  app_id                 = aws_amplify_app.this.id
  domain_name            = var.custom_domain.zone_name
  enable_auto_sub_domain = true

  dynamic "sub_domain" {
    for_each = toset(var.custom_domain.sub_domains)
    content {
      branch_name = aws_amplify_branch.this.branch_name
      prefix      = trimsuffix(sub_domain.value, var.custom_domain.zone_name)
    }
  }
}