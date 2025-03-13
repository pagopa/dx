resource "aws_amplify_app" "this" {
  name         = "${local.project}-${var.environment.domain}-${var.environment.app_name}-${var.environment.instance_number}"
  repository   = "https://github.com/${var.repository.organization}/${var.repository.name}"
  access_token = var.github_authorization_type == "PAT" ? var.github_pat : null

  environment_variables = local.environment_variables
  platform              = var.is_ssr ? "WEB_COMPUTE" : "WEB"
  iam_service_role_arn  = aws_iam_role.this.arn

  # The default build_spec added by the Amplify Console for React.
  build_spec = templatefile(
    "${path.module}/templates/buildspec.yaml.tpl",
    {
      app_root = var.build_information.app_path
      pre_build_commands = jsonencode(var.build_information.install_commands)
      build_commands = jsonencode(concat(["env >> ${var.build_information.app_path}/.env"], var.build_information.build_commands))
      build_dir = var.build_information.build_path
    }
  )

  # The default rewrites and redirects added by the Amplify Console.
  dynamic "custom_rule" {
    for_each = concat([{
      source = "/<*>"
      status = "404"
      target = "/index.html"
    }], var.redirect_rules)

    content {
      source = custom_rule.value.source
      status = custom_rule.value.status
      target = custom_rule.value.target
    }
  }

  cache_config {
    type = "AMPLIFY_MANAGED"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "this" {
  app_id                      = aws_amplify_app.this.id
  branch_name                 = var.repository.branch_name
  enable_auto_build           = true
  enable_pull_request_preview = true
  stage                       = var.environment.env_short == "p" ? "PRODUCTION" : "DEVELOPMENT"

  # Enable SNS notifications.
  enable_notification = var.monitoring.enabled
  tags                = var.tags
}

resource "aws_ssm_parameter" "secret" {
  for_each = { for secret in var.secrets : secret.name => secret }

  name        = format("/amplify/%s/%s/%s", aws_amplify_app.this.id, aws_amplify_branch.this.branch_name, each.value.name)
  description = "AWS Amplify secret app: ${aws_amplify_app.this.name} branch: ${aws_amplify_branch.this.branch_name}"
  type        = "SecureString"
  tier        = "Standard"
  value       = each.value.value
  data_type   = "text"

  tags = var.tags
}