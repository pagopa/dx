locals {
  project = "${var.environment.prefix}-${var.environment.env_short}"
  domain  = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${var.environment.app_name}-opnext-server"
  app_suffix = var.environment.instance_number

  function_name = "${local.app_prefix}-lambda-${local.app_suffix}"
}
