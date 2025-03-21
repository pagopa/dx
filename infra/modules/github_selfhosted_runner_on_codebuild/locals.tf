locals {
  project = "${var.environment.prefix}-${var.environment.env_short}"
  domain  = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${var.environment.app_name}"
  app_suffix = var.environment.instance_number

  cloudwatch_log_group  = "${local.app_prefix}-gh-runner-${local.app_suffix}"
  cloudwatch_log_stream = "logs"

  compute_type = {
    "s"  = "BUILD_GENERAL1_SMALL"
    "m"  = "BUILD_GENERAL1_MEDIUM"
    "l"  = "BUILD_GENERAL1_LARGE"
  }

  has_github_personal_access_token               = try(var.personal_access_token.value, null) != null
  has_github_personal_access_token_ssm_parameter = try(var.personal_access_token.ssm_parameter_name, null) != null
}
