locals {
  project = "${var.environment.prefix}-${var.environment.env_short}"
  domain  = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${var.environment.app_name}"
  app_suffix = var.environment.instance_number
}
