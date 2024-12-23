locals {
  env = {
    "d" = "dev",
    "u" = "uat",
    "p" = "prod"
  }

  container_apps = {
    job_name            = "${module.naming_convention.prefix}-caj-${module.naming_convention.suffix}"
    resource_group_name = var.resource_group_name == null ? "${module.naming_convention.prefix}-github-runner-rg-01" : var.resource_group_name
  }

  labels = coalescelist(var.container_app_environment.override_labels, [local.env[var.environment.env_short]])
}
