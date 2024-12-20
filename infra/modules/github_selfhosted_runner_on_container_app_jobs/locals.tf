locals {
  env = {
    "d" = "dev",
    "u" = "uat",
    "p" = "prod"
  }

  container_apps = {
    job_name            = module.naming_convention.name.container_app_job["1"]
    resource_group_name = var.resource_group_name == null ? "${module.naming_convention.prefix}-github-runner-rg-01" : var.resource_group_name
  }
}
