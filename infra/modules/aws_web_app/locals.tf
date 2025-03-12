locals {
  project = "${var.environment.prefix}-${var.environment.env_short}"

  environment_variables = merge({
    "_BUILD_TIMEOUT"            = "120"
    "AMPLIFY_MONOREPO_APP_ROOT" = var.build_information.app_path
  }, var.environment_variables)
}